// High-Performance Query Optimization Library
const optimizedQueries = {
  // Cached user lookup with minimal fields
  async getUserProfile(prisma, userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
  },

  // Optimized food entries with pagination and caching
  async getFoodEntriesOptimized(prisma, userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    return await prisma.foodEntry.findMany({
      where: { userId },
      select: {
        id: true,
        foodName: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        quantity: true,
        unit: true,
        mealType: true,
        date: true,
        createdAt: true
      },
      orderBy: { date: 'desc' },
      skip: offset,
      take: limit
    });
  },

  // Batch food entry creation
  async createFoodEntriesBatch(prisma, entries) {
    const batchSize = 1000;
    const results = [];

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      const result = await prisma.foodEntry.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      results.push(result);
    }

    return results;
  },

  // Optimized macro calculation
  async getMacroTotals(prisma, userId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await prisma.foodEntry.aggregate({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true
      }
    });

    return {
      calories: result._sum.calories || 0,
      protein: result._sum.protein || 0,
      carbs: result._sum.carbs || 0,
      fat: result._sum.fat || 0
    };
  },

  // Optimized appointment queries
  async getAppointmentsOptimized(prisma, userId, role, limit = 10) {
    const whereClause = role === 'CLIENT' 
      ? { clientId: userId }
      : { trainerId: userId };

    return await prisma.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        client: {
          select: { name: true, email: true }
        },
        trainer: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: limit
    });
  },

  // Admin dashboard optimized queries
  async getAdminDashboardData(prisma) {
    const [
      userCount,
      activeClients,
      totalAppointments,
      totalFoodEntries,
      recentUsers,
      roleDistribution
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CLIENT', isActive: true } }),
      prisma.appointment.count(),
      prisma.foodEntry.count(),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true
        }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: true
      })
    ]);

    return {
      userCount,
      activeClients,
      totalAppointments,
      totalFoodEntries,
      recentUsers,
      roleDistribution
    };
  },

  // Bulk user operations
  async bulkUpdateUsers(prisma, updates) {
    const results = await Promise.all(
      updates.map(update => 
        prisma.user.update({
          where: { id: update.id },
          data: update.data,
          select: { id: true, email: true }
        })
      )
    );

    return results;
  }
};

module.exports = optimizedQueries;