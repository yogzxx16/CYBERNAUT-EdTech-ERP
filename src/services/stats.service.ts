import { api, unwrap, type ApiEnvelope } from "./api";

export interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  totalDepartments: number;
  activeDepartments: number;
  totalRoles: number;
  activeProjects: number;
  pendingTasks: number;
  pendingLeaves: number;
  todayAttendance: number;
}

export interface DashboardCharts {
  departmentDistribution: { name: string; value: number }[];
  projectStatus: { name: string; value: number }[];
  attendanceSeries: { date: string; count: number }[];
  leaveSeries: { month: string; pending: number; approved: number; rejected: number }[];
  recentActivities: {
    id: string;
    action: string;
    summary: string;
    actorName: string;
    createdAt: string;
  }[];
}

export interface MeTaskMini {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt?: string | null;
  project: string | null;
}

export interface MeSummary {
  myPendingTasks: number;
  myOpenTasks: MeTaskMini[];
  myOverdueTasks: MeTaskMini[];
  myDueToday: MeTaskMini[];
  myRecentCompleted: MeTaskMini[];
  myUpcomingDeadlines: MeTaskMini[];
  myPendingLeaves: number;
  leaveBalance: { quota: number; used: number; remaining: number };
  upcomingEvents: {
    id: string;
    title: string;
    venue?: string;
    eventDate: string;
    organizer: string | null;
  }[];
  pendingApprovals: { leaves: number; tickets: number };
  upcomingBirthdays: { id: string; name: string; dob: string | null; profileImage?: string }[];
}

export interface EmployeeAnalytics {
  pendingTasks: number;
  approvedTasks: number;
  rejectedTasks: number;
  changesRequested: number;
  avgCompletionHours: number;
  completedCount: number;
  recentActivity: {
    id: string;
    action: string;
    summary: string;
    actorName: string;
    actorRole: string | null;
    createdAt: string;
  }[];
}

export interface ManagerAnalytics {
  tasksAwaitingReview: number;
  overdueReviews: number;
  avgReviewHours: number;
  reviewedCount: number;
  projectCompletionAvg: number;
  recentSubmissions: {
    id: string;
    kind: "task" | "project";
    title: string;
    status: string;
    project: string | null;
    submittedBy: string | null;
    updatedAt: string;
  }[];
}

export interface AdminAnalytics {
  totalSubmissions: number;
  submissionPct: number;
  approvalPct: number;
  rejectedPct: number;
  pendingPct: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  avgApprovalHours: number;
  approvedReviewed: number;
  departmentProductivity: { name: string; value: number }[];
  attendancePct: number;
  leaveSeries: { month: string; pending: number; approved: number; rejected: number }[];
  salaryDistribution: { name: string; value: number; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    summary: string;
    actorName: string;
    actorRole: string | null;
    createdAt: string;
  }[];
}

export interface DashboardAnalytics {
  role: string;
  employee: EmployeeAnalytics;
  manager: ManagerAnalytics | null;
  admin: AdminAnalytics | null;
}

export const statsApi = {
  async overview() {
    const res = await api.get<ApiEnvelope<DashboardOverview>>("/stats/overview");
    return unwrap(res.data);
  },
  async charts() {
    const res = await api.get<ApiEnvelope<DashboardCharts>>("/stats/charts");
    return unwrap(res.data);
  },
  async meSummary() {
    const res = await api.get<ApiEnvelope<MeSummary>>("/stats/me-summary");
    return unwrap(res.data);
  },
  async analytics() {
    const res = await api.get<ApiEnvelope<DashboardAnalytics>>("/stats/analytics");
    return unwrap(res.data);
  },
};
