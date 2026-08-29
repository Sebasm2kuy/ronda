// Tipos compartidos entre servidor y cliente

export interface PublicUser {
  id: string;
  name: string;
  age: number;
  city: string;
  gender: string;
  lookingFor: string;
  preference: string;
  interests: string[];
  bio: string | null;
  photoUrl: string | null;
  videoUrl: string | null;
  status: string;
  isDemo: boolean;
  provider: string;
  createdAt: string;
}

export interface RoundInfo {
  id: string;
  status: string;
  startedAt: string;
  partner: PublicUser;
}

export interface ConnectionInfo {
  id: string;
  status: string;
  createdAt: string;
  partner: PublicUser;
  lastMessage: { content: string; createdAt: string; mine: boolean } | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  mine: boolean;
}

export interface EventInfo {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  description: string;
  dateLabel: string;
  capacity: number;
  attendees: number;
  spotsLeft: number;
  joined: boolean;
}

export interface LiveStatus {
  connected: number;
  inRound: number;
  available: number;
}

export interface AdminStats {
  users: { total: number; real: number; demo: number };
  statusCounts: Record<string, number>;
  activeRounds: number;
  completedRounds: number;
  connections: number;
  pendingConnections: number;
  openReports: number;
  usersList: Array<PublicUser & { email: string }>;
  roundsList: Array<{
    id: string;
    status: string;
    startedAt: string;
    userA: string;
    userB: string;
  }>;
  reportsList: Array<{
    id: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
    reporter: string;
    reported: string;
  }>;
}
