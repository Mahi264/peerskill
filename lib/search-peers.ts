import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PeerSearchInput } from "@/lib/validations/search";

const LEVEL_WEIGHTS: Record<string, number> = {
  MENTOR: 4,
  ADVANCED: 3,
  INTERMEDIATE: 2,
  BEGINNER: 1,
};

export interface FormattedPeer {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  department: string;
  branch: string | null;
  section: string | null;
  graduationYear: number | null;
  bio: string | null;
  helpAvailable: boolean;
  helpStatus: string | null;
  skills: Array<{
    id: string;
    name: string;
    slug: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";
  }>;
  stats: {
    doubtsCount: number;
    answersCount: number;
  };
}

export interface PeerSearchResult {
  peers: FormattedPeer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function searchPeers(input: PeerSearchInput): Promise<PeerSearchResult> {
  const {
    q,
    skill,
    skillId,
    department,
    available,
    level,
    page = 1,
    limit = 10,
  } = input;

  const rawQuery = q?.trim() || "";
  const filterSkill = (skillId || skill)?.trim() || "";

  const profileFilter: Prisma.ProfileWhereInput = {};

  // Department filter
  if (department && department !== "ALL") {
    profileFilter.department = {
      equals: department,
    };
  }

  // Availability filter
  if (available !== undefined) {
    profileFilter.helpAvailable = available;
  }

  const where: Prisma.UserWhereInput = {
    status: "ACTIVE",
    profile: {
      isNot: null,
      is: Object.keys(profileFilter).length > 0 ? profileFilter : undefined,
    },
  };

  // Level minimum filtering threshold
  const minLevelWeight = level ? LEVEL_WEIGHTS[level] || 1 : 1;

  // Specific skill filter
  if (filterSkill) {
    where.userSkills = {
      some: {
        skill: {
          OR: [
            { id: filterSkill },
            { name: { contains: filterSkill } },
            { slug: { contains: filterSkill.toLowerCase() } },
          ],
        },
      },
    };
  }

  // General text query matching name, department, bio, or skill name
  if (rawQuery) {
    where.OR = [
      { profile: { fullName: { contains: rawQuery } } },
      { profile: { department: { contains: rawQuery } } },
      { profile: { bio: { contains: rawQuery } } },
      {
        userSkills: {
          some: {
            skill: {
              OR: [
                { name: { contains: rawQuery } },
                { slug: { contains: rawQuery.toLowerCase() } },
              ],
            },
          },
        },
      },
    ];
  }

  // Fetch candidate users matching filter criteria
  const candidateUsers = await prisma.user.findMany({
    where,
    include: {
      profile: true,
      userSkills: {
        include: {
          skill: true,
        },
      },
      _count: {
        select: {
          doubts: true,
          answers: true,
        },
      },
    },
  });

  // Filter and score candidates based on skill dominance and relevance
  const queryLower = rawQuery.toLowerCase();
  const filterSkillLower = filterSkill.toLowerCase();

  const scoredUsers = candidateUsers
    .filter((u) => {
      if (!u.profile) return false;
      // If level is specified, ensure at least one matching/relevant skill meets the minimum level
      if (level) {
        const hasSkillMeetingLevel = u.userSkills.some((us) => {
          const usLevelWeight = LEVEL_WEIGHTS[us.level] || 1;
          if (filterSkill) {
            const matchesSkill =
              us.skill.id === filterSkill ||
              us.skill.name.toLowerCase().includes(filterSkillLower) ||
              us.skill.slug.toLowerCase().includes(filterSkillLower);
            return matchesSkill && usLevelWeight >= minLevelWeight;
          }
          return usLevelWeight >= minLevelWeight;
        });
        if (!hasSkillMeetingLevel) return false;
      }
      return true;
    })
    .map((u) => {
      let score = 0;
      const fullNameLower = u.profile?.fullName?.toLowerCase() || "";

      // 1. Exact or prefix full name match
      if (queryLower && fullNameLower === queryLower) {
        score += 1000;
      } else if (queryLower && fullNameLower.includes(queryLower)) {
        score += 500;
      }

      // 2. Relevant skill match (Skill Dominance Rule)
      let maxMatchedSkillWeight = 0;
      for (const us of u.userSkills) {
        const skillNameLower = us.skill.name.toLowerCase();
        const skillSlugLower = us.skill.slug.toLowerCase();
        const usWeight = LEVEL_WEIGHTS[us.level] || 1;

        const isSkillTarget =
          (filterSkillLower &&
            (us.skill.id === filterSkill ||
              skillNameLower.includes(filterSkillLower) ||
              skillSlugLower.includes(filterSkillLower))) ||
          (queryLower &&
            (skillNameLower.includes(queryLower) ||
              skillSlugLower.includes(queryLower)));

        if (isSkillTarget) {
          // Relevant skill match receives major base score + level multiplier
          const matchScore = 300 + usWeight * 30;
          if (matchScore > maxMatchedSkillWeight) {
            maxMatchedSkillWeight = matchScore;
          }
        }
      }

      score += maxMatchedSkillWeight;

      // 3. Availability bonus
      if (u.profile?.helpAvailable) {
        score += 50;
      }

      // 4. Department match bonus
      if (
        (department && u.profile?.department === department) ||
        (queryLower && u.profile?.department.toLowerCase().includes(queryLower))
      ) {
        score += 30;
      }

      return {
        user: u,
        score,
      };
    });

  // Sort by score descending, then by creation date descending
  scoredUsers.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.user.createdAt.getTime() - a.user.createdAt.getTime();
  });

  const total = scoredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paginated = scoredUsers.slice(offset, offset + limit);

  const peers: FormattedPeer[] = paginated.map(({ user }) => ({
    id: user.id,
    fullName: user.profile!.fullName,
    avatarUrl: user.profile!.avatarUrl,
    department: user.profile!.department,
    branch: user.profile!.branch,
    section: user.profile!.section,
    graduationYear: user.profile!.graduationYear,
    bio: user.profile!.bio,
    helpAvailable: user.profile!.helpAvailable,
    helpStatus: user.profile!.helpStatus,
    skills: user.userSkills.map((us) => ({
      id: us.skill.id,
      name: us.skill.name,
      slug: us.skill.slug,
      level: us.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR",
    })),
    stats: {
      doubtsCount: user._count.doubts,
      answersCount: user._count.answers,
    },
  }));

  return {
    peers,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
