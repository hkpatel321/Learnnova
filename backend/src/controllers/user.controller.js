const prisma = require('../config/db');

const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: req.user.role === 'admin' ? {} : { role: { in: ['instructor', 'admin'] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return res.json({
      success: true,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
};
