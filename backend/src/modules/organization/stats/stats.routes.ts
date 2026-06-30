import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requirePermission } from "../../../middlewares/permission.middleware";
import { PERMISSIONS } from "../../../config/permissions";
import { ApiResponse } from "../../../utils/apiResponse";
import { userRepository } from "../../auth/repositories/user.repository";
import { departmentRepository } from "../departments/department.repository";
import { roleRepository } from "../roles/role.repository";
import { projectRepository } from "../../operations/projects/project.repository";
import { taskRepository } from "../../operations/tasks/task.repository";
import { leaveRepository } from "../../operations/leaves/leave.repository";
import { attendanceRepository } from "../../operations/attendance/attendance.repository";
import { auditRepository } from "../../enterprise/audit/audit.repository";
import { activityRepository } from "../../enterprise/activities/activity.repository";
import { salaryRepository } from "../../enterprise/salary/salary.repository";
import mongoose from "mongoose";
import { ROLES } from "../../../config/constants";

const router = Router();
router.use(authenticate);

router.get(
  "/overview",
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  asyncHandler(async (_req, res) => {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalDepartments,
      activeDepartments,
      totalRoles,
      activeProjects,
      pendingTasks,
      pendingLeaves,
      todayAttendance,
    ] = await Promise.all([
      userRepository.model.countDocuments({}).exec(),
      userRepository.model.countDocuments({ accountStatus: "active" }).exec(),
      departmentRepository.count(),
      departmentRepository.count({ status: "active" }),
      roleRepository.count(),
      projectRepository.count({ status: { $in: ["planning", "in_progress", "on_hold"] } }),
      taskRepository.count({ status: { $in: ["pending", "in_progress", "review"] } }),
      leaveRepository.count({ status: "pending" }),
      attendanceRepository.count({ date: startOfToday }),
    ]);

    return ApiResponse.ok(
      res,
      {
        totalUsers,
        activeUsers,
        totalDepartments,
        activeDepartments,
        totalRoles,
        activeProjects,
        pendingTasks,
        pendingLeaves,
        todayAttendance,
      },
      "OK",
    );
  }),
);

router.get(
  "/charts",
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  asyncHandler(async (_req, res) => {
    // Department distribution
    const deptAgg = await userRepository.model
      .aggregate<{ _id: unknown; count: number; name: string }>([
        { $match: { accountStatus: "active" } },
        { $group: { _id: "$department", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "departments",
            localField: "_id",
            foreignField: "_id",
            as: "dept",
          },
        },
        {
          $project: {
            count: 1,
            name: {
              $ifNull: [{ $arrayElemAt: ["$dept.name", 0] }, "Unassigned"],
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .exec();

    // Project status distribution
    const projectStatus = await projectRepository.model
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .exec();

    // Attendance last 7 days
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const sevenAgo = new Date(today);
    sevenAgo.setUTCDate(today.getUTCDate() - 6);

    const attendanceAgg = await attendanceRepository.model
      .aggregate<{ _id: string; count: number }>([
        { $match: { date: { $gte: sevenAgo, $lte: today } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const attendanceMap = new Map(attendanceAgg.map((a) => [a._id, a.count]));
    const attendanceSeries: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(sevenAgo);
      d.setUTCDate(sevenAgo.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      attendanceSeries.push({ date: key, count: attendanceMap.get(key) ?? 0 });
    }

    // Leave trends - last 6 months
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    monthStart.setUTCMonth(monthStart.getUTCMonth() - 5);

    const leavesAgg = await leaveRepository.model
      .aggregate<{ _id: { y: number; m: number; status: string }; count: number }>([
        { $match: { createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: {
              y: { $year: "$createdAt" },
              m: { $month: "$createdAt" },
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const leaveSeries: {
      month: string;
      pending: number;
      approved: number;
      rejected: number;
    }[] = [];
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(monthStart);
      d.setUTCMonth(monthStart.getUTCMonth() + i);
      const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const get = (s: string) =>
        leavesAgg.find((x) => x._id.y === y && x._id.m === m && x._id.status === s)?.count ?? 0;
      leaveSeries.push({
        month: label,
        pending: get("pending"),
        approved: get("approved"),
        rejected: get("rejected"),
      });
    }

    // Recent activities
    const recent = await auditRepository.model
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("actor", "name role")
      .exec();

    return ApiResponse.ok(res, {
      departmentDistribution: deptAgg.map((d) => ({ name: d.name, value: d.count })),
      projectStatus: projectStatus.map((p) => ({ name: p._id, value: p.count })),
      attendanceSeries,
      leaveSeries,
      recentActivities: recent.map((r) => ({
        id: r._id.toString(),
        action: r.action,
        summary: r.summary,
        actorName:
          (r.actor as unknown as { name?: string } | null)?.name ?? r.actorName ?? "System",
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }),
);

router.get(
  "/me-summary",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCHours(23, 59, 59, 999);
    const next7 = new Date(endOfToday);
    next7.setUTCDate(endOfToday.getUTCDate() + 7);
    const yearStart = new Date(now.getUTCFullYear(), 0, 1);
    const yearEnd = new Date(now.getUTCFullYear() + 1, 0, 1);
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { taskRepository: tr } = await import("../../operations/tasks/task.repository");
    const myAssigneeMatch = { $or: [{ assignedTo: userId }, { assignees: userId }] };

    const [
      myPendingTasks,
      myOpenTasks,
      myOverdueTasks,
      myDueToday,
      myRecentCompleted,
      myUpcomingDeadlines,
      myPendingLeaves,
      myApprovedLeavesYear,
      upcomingEventsRaw,
      pendingLeavesAll,
      pendingTicketsAll,
      birthdays,
    ] = await Promise.all([
      tr.model.countDocuments({ ...myAssigneeMatch, status: { $ne: "completed" } }).exec(),
      tr.model
        .find({ ...myAssigneeMatch, status: { $ne: "completed" } })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate("project", "title")
        .exec(),
      tr.model
        .find({
          ...myAssigneeMatch,
          status: { $ne: "completed" },
          dueDate: { $lt: startOfToday },
        })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate("project", "title")
        .exec(),
      tr.model
        .find({
          ...myAssigneeMatch,
          status: { $ne: "completed" },
          dueDate: { $gte: startOfToday, $lte: endOfToday },
        })
        .sort({ priority: 1 })
        .limit(5)
        .populate("project", "title")
        .exec(),
      tr.model
        .find({ ...myAssigneeMatch, status: "completed" })
        .sort({ completedAt: -1 })
        .limit(5)
        .populate("project", "title")
        .exec(),
      tr.model
        .find({
          ...myAssigneeMatch,
          status: { $ne: "completed" },
          dueDate: { $gt: endOfToday, $lte: next7 },
        })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate("project", "title")
        .exec(),
      (await import("../../operations/leaves/leave.repository")).leaveRepository.model
        .countDocuments({ employee: userId, status: "pending" })
        .exec(),
      (await import("../../operations/leaves/leave.repository")).leaveRepository.model
        .aggregate([
          {
            $match: {
              employee: new (await import("mongoose")).Types.ObjectId(userId),
              status: "approved",
              startDate: { $gte: yearStart, $lt: yearEnd },
            },
          },
          { $group: { _id: null, used: { $sum: "$numberOfDays" } } },
        ])
        .exec(),
      (await import("../../enterprise/events/event.repository")).eventRepository.model
        .find({
          status: { $in: ["scheduled", "ongoing"] },
          eventDate: { $gte: now, $lte: next30 },
        })
        .sort({ eventDate: 1 })
        .limit(8)
        .populate("organizer", "name")
        .exec(),
      (await import("../../operations/leaves/leave.repository")).leaveRepository.model
        .countDocuments({ status: "pending" })
        .exec(),
      (await import("../../enterprise/tickets/ticket.repository")).ticketRepository.model
        .countDocuments({ status: { $in: ["open", "pending"] } })
        .exec(),
      userRepository.model
        .aggregate([
          { $match: { dob: { $exists: true, $ne: null, $type: "date" }, accountStatus: "active" } },
          {
            $addFields: {
              dobMonth: { $month: "$dob" },
              dobDay: { $dayOfMonth: "$dob" },
            },
          },
          {
            $match: {
              $expr: {
                $or: [
                  {
                    $and: [
                      { $eq: ["$dobMonth", now.getUTCMonth() + 1] },
                      { $gte: ["$dobDay", now.getUTCDate()] },
                    ],
                  },
                  {
                    $and: [
                      { $eq: ["$dobMonth", next30.getUTCMonth() + 1] },
                      { $lte: ["$dobDay", next30.getUTCDate()] },
                    ],
                  },
                ],
              },
            },
          },
          { $project: { name: 1, dob: 1, profileImage: 1 } },
          { $limit: 10 },
        ])
        .exec(),
    ]);

    const ANNUAL_LEAVE_QUOTA = 20;
    const leaveUsed = (myApprovedLeavesYear?.[0]?.used as number) ?? 0;

    const toTaskMini = (t: { _id: { toString(): string }; title: string; status: string; priority: string; dueDate?: Date | null; completedAt?: Date | null; project?: unknown }) => ({
      id: t._id.toString(),
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
      project: (t.project as unknown as { title?: string } | null)?.title ?? null,
    });

    return ApiResponse.ok(res, {
      myPendingTasks,
      myOpenTasks: myOpenTasks.map(toTaskMini),
      myOverdueTasks: myOverdueTasks.map(toTaskMini),
      myDueToday: myDueToday.map(toTaskMini),
      myRecentCompleted: myRecentCompleted.map(toTaskMini),
      myUpcomingDeadlines: myUpcomingDeadlines.map(toTaskMini),
      myPendingLeaves,
      leaveBalance: { quota: ANNUAL_LEAVE_QUOTA, used: leaveUsed, remaining: Math.max(0, ANNUAL_LEAVE_QUOTA - leaveUsed) },
      upcomingEvents: upcomingEventsRaw.map((e) => ({
        id: e._id.toString(),
        title: e.title,
        venue: e.venue,
        eventDate: e.eventDate.toISOString(),
        organizer: (e.organizer as unknown as { name?: string } | null)?.name ?? null,
      })),
      pendingApprovals: { leaves: pendingLeavesAll, tickets: pendingTicketsAll },
      upcomingBirthdays: birthdays.map((b) => ({
        id: b._id.toString(),
        name: b.name,
        dob: b.dob ? new Date(b.dob).toISOString() : null,
        profileImage: b.profileImage,
      })),
    });
  }),
);

/* ------------------------------------------------------------------ */
/* Dashboard Analytics — role-based metric blocks                      */
/* ------------------------------------------------------------------ */

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
    const isManager = isAdmin; // managers map to admins in current RBAC

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // ---------------- Employee block (always returned) ----------------
    const { taskRepository: tr } = await import("../../operations/tasks/task.repository");
    const myMatch = { $or: [{ assignedTo: userObjectId }, { assignees: userObjectId }] };

    const [
      empPending,
      empApproved,
      empRejected,
      empChanges,
      empCompletionAgg,
      empRecent,
    ] = await Promise.all([
      tr.model.countDocuments({ ...myMatch, status: { $ne: "completed" } }).exec(),
      tr.model.countDocuments({ ...myMatch, submissionStatus: "approved" }).exec(),
      tr.model.countDocuments({ ...myMatch, submissionStatus: "rejected" }).exec(),
      tr.model.countDocuments({ ...myMatch, submissionStatus: "changes_requested" }).exec(),
      tr.model
        .aggregate<{ _id: null; avgMs: number; count: number }>([
          {
            $match: {
              ...myMatch,
              status: "completed",
              completedAt: { $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              avgMs: { $avg: { $subtract: ["$completedAt", "$createdAt"] } },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
      activityRepository.model
        .find({ actor: userObjectId })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("actor", "name role avatarUrl")
        .exec(),
    ]);

    const employee = {
      pendingTasks: empPending,
      approvedTasks: empApproved,
      rejectedTasks: empRejected,
      changesRequested: empChanges,
      avgCompletionHours: empCompletionAgg[0]?.avgMs
        ? Math.round((empCompletionAgg[0].avgMs / 36e5) * 10) / 10
        : 0,
      completedCount: empCompletionAgg[0]?.count ?? 0,
      recentActivity: empRecent.map((a) => ({
        id: a._id.toString(),
        action: a.action,
        summary: a.summary,
        actorName: (a.actor as unknown as { name?: string } | null)?.name ?? a.actorName ?? "System",
        actorRole: (a.actor as unknown as { role?: string } | null)?.role ?? a.actorRole ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    };

    // ---------------- Manager block ----------------
    let manager: unknown = null;
    if (isManager) {
      const { projectRepository: pr } = await import("../../operations/projects/project.repository");

      const [
        tasksAwaiting,
        projAwaiting,
        overdueTasks,
        overdueProjects,
        reviewAgg,
        projectsAvg,
        recentSubmissionsTasks,
        recentSubmissionsProjects,
      ] = await Promise.all([
        tr.model.countDocuments({ submissionStatus: "pending_review" }).exec(),
        pr.model.countDocuments({ submissionStatus: "pending_review" }).exec(),
        tr.model.countDocuments({
          submissionStatus: "pending_review",
          "submissions.submittedAt": { $lt: last3Days },
        }).exec(),
        pr.model.countDocuments({
          submissionStatus: "pending_review",
          "submissions.submittedAt": { $lt: last3Days },
        }).exec(),
        tr.model
          .aggregate<{ _id: null; avgMs: number; count: number }>([
            { $unwind: "$submissions" },
            { $match: { "submissions.reviewedAt": { $ne: null } } },
            {
              $group: {
                _id: null,
                avgMs: {
                  $avg: { $subtract: ["$submissions.reviewedAt", "$submissions.submittedAt"] },
                },
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
        pr.model
          .aggregate<{ _id: null; avg: number }>([
            { $match: { status: { $ne: "archived" } } },
            { $group: { _id: null, avg: { $avg: "$completionPercentage" } } },
          ])
          .exec(),
        tr.model
          .find({ submissionStatus: { $in: ["pending_review", "approved", "rejected", "changes_requested"] } })
          .sort({ updatedAt: -1 })
          .limit(5)
          .populate("assignedTo", "name role avatarUrl")
          .populate("project", "title")
          .exec(),
        pr.model
          .find({ submissionStatus: { $in: ["pending_review", "approved", "rejected", "changes_requested"] } })
          .sort({ updatedAt: -1 })
          .limit(5)
          .populate("projectManager", "name role avatarUrl")
          .exec(),
      ]);

      const recentSubmissions = [
        ...recentSubmissionsTasks.map((t) => ({
          id: t._id.toString(),
          kind: "task" as const,
          title: t.title,
          status: t.submissionStatus,
          project: (t.project as unknown as { title?: string } | null)?.title ?? null,
          submittedBy: (t.assignedTo as unknown as { name?: string } | null)?.name ?? null,
          updatedAt: t.updatedAt.toISOString(),
        })),
        ...recentSubmissionsProjects.map((p) => ({
          id: p._id.toString(),
          kind: "project" as const,
          title: p.title,
          status: p.submissionStatus,
          project: null,
          submittedBy: (p.projectManager as unknown as { name?: string } | null)?.name ?? null,
          updatedAt: p.updatedAt.toISOString(),
        })),
      ]
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
        .slice(0, 8);

      manager = {
        tasksAwaitingReview: tasksAwaiting + projAwaiting,
        overdueReviews: overdueTasks + overdueProjects,
        avgReviewHours: reviewAgg[0]?.avgMs
          ? Math.round((reviewAgg[0].avgMs / 36e5) * 10) / 10
          : 0,
        reviewedCount: reviewAgg[0]?.count ?? 0,
        projectCompletionAvg: projectsAvg[0]?.avg
          ? Math.round(projectsAvg[0].avg * 10) / 10
          : 0,
        recentSubmissions,
      };
    }

    // ---------------- Admin block ----------------
    let admin: unknown = null;
    if (isAdmin) {
      const { projectRepository: pr } = await import("../../operations/projects/project.repository");
      const { leaveRepository: lr } = await import("../../operations/leaves/leave.repository");

      const [
        subStatusTasks,
        subStatusProjects,
        approvalAgg,
        deptProductivity,
        attendanceAgg,
        leavesAgg,
        salaryByDept,
        recentActivityAll,
      ] = await Promise.all([
        tr.model
          .aggregate<{ _id: string; count: number }>([
            { $group: { _id: "$submissionStatus", count: { $sum: 1 } } },
          ])
          .exec(),
        pr.model
          .aggregate<{ _id: string; count: number }>([
            { $group: { _id: "$submissionStatus", count: { $sum: 1 } } },
          ])
          .exec(),
        tr.model
          .aggregate<{ _id: null; avgMs: number; count: number }>([
            { $unwind: "$submissions" },
            { $match: { "submissions.status": "approved", "submissions.reviewedAt": { $ne: null } } },
            {
              $group: {
                _id: null,
                avgMs: {
                  $avg: { $subtract: ["$submissions.reviewedAt", "$submissions.submittedAt"] },
                },
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
        tr.model
          .aggregate<{ _id: unknown; deptName: string; completed: number }>([
            { $match: { status: "completed", completedAt: { $gte: last30 } } },
            {
              $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "project",
              },
            },
            { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
            { $group: { _id: "$project.department", completed: { $sum: 1 } } },
            {
              $lookup: {
                from: "departments",
                localField: "_id",
                foreignField: "_id",
                as: "dept",
              },
            },
            {
              $project: {
                completed: 1,
                deptName: {
                  $ifNull: [{ $arrayElemAt: ["$dept.name", 0] }, "Unassigned"],
                },
              },
            },
            { $sort: { completed: -1 } },
            { $limit: 8 },
          ])
          .exec(),
        (await import("../../operations/attendance/attendance.repository")).attendanceRepository.model
          .aggregate<{ _id: string; count: number }>([
            { $match: { date: { $gte: last30 } } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ])
          .exec(),
        lr.model
          .aggregate<{ _id: { y: number; m: number; status: string }; count: number }>([
            {
              $match: {
                createdAt: {
                  $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
                },
              },
            },
            {
              $group: {
                _id: {
                  y: { $year: "$createdAt" },
                  m: { $month: "$createdAt" },
                  status: "$status",
                },
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
        salaryRepository.model
          .aggregate<{ _id: unknown; deptName: string; total: number; count: number }>([
            { $sort: { year: -1, month: -1 } },
            { $limit: 500 },
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "emp",
              },
            },
            { $unwind: { path: "$emp", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: "$emp.department",
                total: { $sum: "$netSalary" },
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "departments",
                localField: "_id",
                foreignField: "_id",
                as: "dept",
              },
            },
            {
              $project: {
                total: 1,
                count: 1,
                deptName: {
                  $ifNull: [{ $arrayElemAt: ["$dept.name", 0] }, "Unassigned"],
                },
              },
            },
            { $sort: { total: -1 } },
            { $limit: 8 },
          ])
          .exec(),
        activityRepository.model
          .find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("actor", "name role avatarUrl")
          .exec(),
      ]);

      const merge = (rows: { _id: string; count: number }[]) => {
        const map = new Map<string, number>();
        for (const r of rows) map.set(r._id, (map.get(r._id) ?? 0) + r.count);
        return map;
      };
      const taskMap = merge(subStatusTasks);
      const projMap = merge(subStatusProjects);
      const totalSubmissions =
        (taskMap.get("pending_review") ?? 0) +
        (taskMap.get("approved") ?? 0) +
        (taskMap.get("rejected") ?? 0) +
        (taskMap.get("changes_requested") ?? 0) +
        (projMap.get("pending_review") ?? 0) +
        (projMap.get("approved") ?? 0) +
        (projMap.get("rejected") ?? 0) +
        (projMap.get("changes_requested") ?? 0);
      const sumStatus = (s: string) => (taskMap.get(s) ?? 0) + (projMap.get(s) ?? 0);
      const pct = (n: number) =>
        totalSubmissions > 0 ? Math.round((n / totalSubmissions) * 1000) / 10 : 0;

      // Attendance %
      const attMap = new Map<string, number>(attendanceAgg.map((a) => [a._id, a.count]));
      const present = (attMap.get("present") ?? 0) + (attMap.get("half_day") ?? 0) * 0.5;
      const tracked =
        (attMap.get("present") ?? 0) +
        (attMap.get("absent") ?? 0) +
        (attMap.get("half_day") ?? 0) +
        (attMap.get("leave") ?? 0);
      const attendancePct = tracked > 0 ? Math.round((present / tracked) * 1000) / 10 : 0;

      // Leave trends — 6 months
      const leaveSeries: {
        month: string;
        pending: number;
        approved: number;
        rejected: number;
      }[] = [];
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const get = (s: string) =>
          leavesAgg.find((x) => x._id.y === y && x._id.m === m && x._id.status === s)?.count ?? 0;
        leaveSeries.push({
          month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          pending: get("pending"),
          approved: get("approved"),
          rejected: get("rejected"),
        });
      }

      admin = {
        totalSubmissions,
        submissionPct: 100,
        approvalPct: pct(sumStatus("approved")),
        rejectedPct: pct(sumStatus("rejected")),
        pendingPct: pct(sumStatus("pending_review") + sumStatus("changes_requested")),
        approvedCount: sumStatus("approved"),
        rejectedCount: sumStatus("rejected"),
        pendingCount: sumStatus("pending_review") + sumStatus("changes_requested"),
        avgApprovalHours: approvalAgg[0]?.avgMs
          ? Math.round((approvalAgg[0].avgMs / 36e5) * 10) / 10
          : 0,
        approvedReviewed: approvalAgg[0]?.count ?? 0,
        departmentProductivity: deptProductivity.map((d) => ({
          name: d.deptName,
          value: d.completed,
        })),
        attendancePct,
        leaveSeries,
        salaryDistribution: salaryByDept.map((s) => ({
          name: s.deptName,
          value: s.total,
          count: s.count,
        })),
        recentActivity: recentActivityAll.map((a) => ({
          id: a._id.toString(),
          action: a.action,
          summary: a.summary,
          actorName: (a.actor as unknown as { name?: string } | null)?.name ?? a.actorName ?? "System",
          actorRole: (a.actor as unknown as { role?: string } | null)?.role ?? a.actorRole ?? null,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    }

    return ApiResponse.ok(res, { role, employee, manager, admin });
  }),
);

export const statsRouter = router;
