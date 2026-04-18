import { getClientContext, requireClientSession, startOfWeek } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import ProgramMobile, {
  type ProgramMobileData,
  type ProgramMobileDayBucket,
} from './program-mobile';
import ProgramDesktop, {
  type ProgramDesktopData,
  type ProgramDesktopWeekDay,
} from './program-desktop';

export const dynamic = 'force-dynamic';

const DOW_TO_IDX: Record<string, number> = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6,
};

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

async function getProgramData(userId: string) {
  const fourBack = new Date();
  fourBack.setDate(fourBack.getDate() - 28);
  const fourForward = new Date();
  fourForward.setDate(fourForward.getDate() + 28);

  const [sessions, assignment] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId,
        startTime: { gte: fourBack, lte: fourForward },
      },
      orderBy: { startTime: 'asc' },
      include: {
        workout: {
          select: { id: true, title: true, type: true, duration: true, difficulty: true },
        },
      },
    }),
    prisma.programAssignment.findFirst({
      where: { clientId: userId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      include: {
        assigner: { select: { id: true, name: true } },
        program: {
          include: {
            creator: { select: { id: true, name: true } },
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                days: {
                  orderBy: { order: 'asc' },
                  include: {
                    exercises: {
                      orderBy: { order: 'asc' },
                      include: { exercise: { select: { id: true, name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return { sessions, assignment };
}

function bucketByDay(
  sessions: Array<{
    id: string;
    startTime: Date;
    completed: boolean;
    workout: { id: string; title: string; type: string; duration: number };
  }>,
  weekStart: Date,
): ProgramMobileDayBucket[] {
  const todayKey = new Date();
  todayKey.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const todaysSessions = sessions
      .filter((s) => s.startTime.toISOString().slice(0, 10) === key)
      .map((s) => ({
        id: s.id,
        title: s.workout.title,
        type: s.workout.type,
        duration: s.workout.duration,
        completed: s.completed,
      }));
    return {
      date: d,
      dayIdx: i,
      sessions: todaysSessions,
      isToday: d.toDateString() === todayKey.toDateString(),
    };
  });
}

/** Extract "Phase N" from a program name if present, returns uppercase "PHASE N" or null. */
function extractPhaseLabel(name: string): string | null {
  const m = name.match(/phase\s+(\d+|[ivx]+)/i);
  return m ? m[0]!.toUpperCase() : null;
}

function formatStartedLabel(d: Date): string {
  const mo = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `STARTED ${mo} ${d.getDate()}`;
}

export default async function ClientProgramPage() {
  const session = await requireClientSession();
  const [ctx, { sessions, assignment }] = await Promise.all([
    getClientContext(session.user.id),
    getProgramData(session.user.id),
  ]);

  const currentWeekStart = startOfWeek();
  const weeks = Array.from({ length: 5 }, (_, i) => {
    const s = new Date(currentWeekStart);
    s.setDate(currentWeekStart.getDate() + (i - 2) * 7);
    return s;
  });

  const currentWeekBuckets = bucketByDay(
    sessions.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      completed: s.completed,
      workout: s.workout,
    })),
    currentWeekStart,
  );

  const completedThisWeek = currentWeekBuckets.reduce(
    (acc, d) => acc + d.sessions.filter((x) => x.completed).length,
    0,
  );
  const sessionsThisWeek = currentWeekBuckets.reduce(
    (acc, d) => acc + d.sessions.length,
    0,
  );
  const completionPct = sessionsThisWeek
    ? Math.round((completedThisWeek / sessionsThisWeek) * 100)
    : 0;

  // Mobile-specific program badge/week-days
  let programBadge: ProgramMobileData['programBadge'] = null;
  let programWeekDaysMobile: ProgramMobileData['programWeekDays'] = null;

  // Desktop data scaffolding
  let weekNumber = 1;
  let totalWeeks = 0;
  let programName: string | null = null;
  let phaseLabel: string | null = null;
  let coachName: string | null = null;
  let coachNotes: string | null = null;
  let startedLabel: string | null = null;
  let desktopWeekDays: ProgramDesktopWeekDay[] = WEEKDAY_LABELS.map((l) => ({
    label: l,
    sessionType: 'Rest',
    isRest: true,
    isToday: false,
    exerciseCount: 0,
    topExercises: [],
  }));
  let nextBlock: ProgramDesktopData['nextBlock'] = null;
  let sessionsPlanned = 0;
  let weekSessionsPlanned = 0;

  const todayKey = new Date();
  todayKey.setHours(0, 0, 0, 0);
  const todayDow = todayKey.getDay(); // 0=Sun..6=Sat
  const todayIdxMonFirst = todayDow === 0 ? 6 : todayDow - 1;

  if (assignment?.program) {
    const daysElapsed = Math.floor(
      (Date.now() - new Date(assignment.startDate).getTime()) / 86400000,
    );
    totalWeeks = assignment.program.durationWks;
    const weekIdx = Math.max(
      0,
      Math.min(assignment.program.weeks.length - 1, Math.floor(daysElapsed / 7)),
    );
    const activeWeek = assignment.program.weeks[weekIdx];
    programName = assignment.program.name;
    phaseLabel = extractPhaseLabel(programName);
    coachName =
      assignment.assigner?.name ?? assignment.program.creator?.name ?? null;
    coachNotes = assignment.notes ?? null;
    startedLabel = formatStartedLabel(new Date(assignment.startDate));

    if (activeWeek) {
      weekNumber = activeWeek.weekNumber;

      programBadge = {
        name: assignment.program.name,
        weekNumber: activeWeek.weekNumber,
        total: assignment.program.durationWks,
      };
      programWeekDaysMobile = activeWeek.days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        sessionType: d.sessionType,
        exerciseCount: d.exercises.length,
      }));

      // Build desktop 7-day week grid
      const byDow = new Map<number, (typeof activeWeek.days)[number]>();
      for (const d of activeWeek.days) {
        const idx = DOW_TO_IDX[d.dayOfWeek];
        if (idx != null) byDow.set(idx, d);
      }
      desktopWeekDays = WEEKDAY_LABELS.map((label, i) => {
        const day = byDow.get(i);
        const isRest =
          !day || day.sessionType.toLowerCase() === 'rest' || day.exercises.length === 0;
        return {
          label,
          sessionType: day?.sessionType ?? 'Rest',
          isRest,
          isToday: i === todayIdxMonFirst,
          exerciseCount: day?.exercises.length ?? 0,
          topExercises:
            day?.exercises.slice(0, 4).map((e) => ({ name: e.exercise.name })) ?? [],
        };
      });

      weekSessionsPlanned = activeWeek.days.filter(
        (d) => d.sessionType.toLowerCase() !== 'rest' && d.exercises.length > 0,
      ).length;
    }

    // Planned sessions across the whole program
    sessionsPlanned = assignment.program.weeks.reduce(
      (acc, w) =>
        acc +
        w.days.filter(
          (d) => d.sessionType.toLowerCase() !== 'rest' && d.exercises.length > 0,
        ).length,
      0,
    );

    // Next block preview = next ProgramWeek within this program
    const nextWeek = assignment.program.weeks[weekIdx + 1];
    if (nextWeek) {
      nextBlock = {
        label: nextWeek.name ?? `Week ${nextWeek.weekNumber}`,
        weekNumber: nextWeek.weekNumber,
        sessionTypes: nextWeek.days
          .filter(
            (d) => d.sessionType.toLowerCase() !== 'rest' && d.exercises.length > 0,
          )
          .map((d) => `${d.dayOfWeek} · ${d.sessionType}`),
        note: nextWeek.notes ?? null,
      };
    }
  }

  // Sessions completed against this program (by date window since start)
  const completedSinceStart =
    assignment?.startDate != null
      ? sessions.filter(
          (s) => s.completed && s.startTime >= new Date(assignment.startDate),
        ).length
      : 0;

  const missed = (() => {
    if (!assignment) return 0;
    // "Missed" = planned sessions whose date has passed but no completed session that day
    // Conservative: use currentWeekBuckets for the current week
    let m = 0;
    for (const b of currentWeekBuckets) {
      if (b.date > todayKey) break;
      if (b.sessions.length > 0 && b.sessions.every((s) => !s.completed)) m++;
    }
    return m;
  })();

  const mobileData: ProgramMobileData = {
    programBadge,
    programWeekDays: programWeekDaysMobile,
    weeks,
    currentWeekStart,
    currentWeekBuckets,
    completedThisWeek,
    sessionsThisWeek,
    completionPct,
    totalSessionsInView: sessions.length,
  };

  const desktopData: ProgramDesktopData = {
    programName,
    phaseLabel,
    weekNumber,
    totalWeeks,
    startedLabel,
    coachName,
    coachNotes,
    weekDays: desktopWeekDays,
    stats: {
      sessionsCompleted: completedSinceStart,
      sessionsPlanned,
      missed,
      weekSessionsPlanned,
      weekSessionsDone: completedThisWeek,
    },
    nextBlock,
  };

  return (
    <>
      <ProgramMobile data={mobileData} />
      <ProgramDesktop ctx={ctx} data={desktopData} />
    </>
  );
}
