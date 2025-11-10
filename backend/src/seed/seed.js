const bcrypt = require('bcryptjs');
const { Department, User, Room, Event, Participant, Notification } = require('../models');

async function runSeed() {
  const count = await User.count();
  if (count > 0) return false; // already seeded

  const [dep1, dep2, dep3] = await Promise.all([
    Department.create({ name: 'Hành chính', description: 'Phòng hành chính' }),
    Department.create({ name: 'Kỹ thuật', description: 'Phòng kỹ thuật' }),
    Department.create({ name: 'Kinh doanh', description: 'Phòng kinh doanh' }),
  ]);

  const pass = await bcrypt.hash('password123', 10);
  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: pass, role: 'admin', departmentId: dep1.id });
  const manager = await User.create({ name: 'Manager', email: 'manager@example.com', password: pass, role: 'manager', departmentId: dep2.id });
  const emp1 = await User.create({ name: 'Employee One', email: 'emp1@example.com', password: pass, role: 'employee', departmentId: dep2.id });
  const emp2 = await User.create({ name: 'Employee Two', email: 'emp2@example.com', password: pass, role: 'employee', departmentId: dep3.id });
  const emp3 = await User.create({ name: 'Employee Three', email: 'emp3@example.com', password: pass, role: 'employee', departmentId: dep3.id });

  const [r1, r2, r3] = await Promise.all([
    Room.create({ name: 'Phòng họp 101', location: 'Tầng 1', capacity: 10 }),
    Room.create({ name: 'Phòng họp 202', location: 'Tầng 2', capacity: 20 }),
    Room.create({ name: 'Phòng họp 303', location: 'Tầng 3', capacity: 15 }),
  ]);

  const now = new Date();
  const e1 = await Event.create({ title: 'Họp dự án', description: 'Trao đổi tiến độ', start_time: now, end_time: new Date(now.getTime()+3600000), roomId: r1.id, createdById: emp1.id });
  const e2 = await Event.create({ title: 'Kế hoạch Q4', description: 'Lập kế hoạch', start_time: now, end_time: new Date(now.getTime()+7200000), roomId: r2.id, createdById: emp2.id });
  const e3 = await Event.create({ title: 'Đào tạo nội bộ', description: 'Kỹ năng mềm', start_time: now, end_time: new Date(now.getTime()+5400000), roomId: r3.id, createdById: emp3.id });
  const e4 = await Event.create({ title: 'Báo cáo tuần', description: 'Tổng kết', start_time: now, end_time: new Date(now.getTime()+3600000), roomId: r1.id, createdById: manager.id });
  const e5 = await Event.create({ title: 'Tuyển dụng', description: 'Phỏng vấn', start_time: now, end_time: new Date(now.getTime()+3600000), roomId: r2.id, createdById: admin.id });

  await Participant.bulkCreate([
    { eventId: e1.id, userId: manager.id },
    { eventId: e1.id, userId: emp2.id },
    { eventId: e2.id, userId: emp1.id },
    { eventId: e2.id, userId: emp3.id },
    { eventId: e3.id, userId: emp1.id },
  ]);

  await Notification.bulkCreate([
    { userId: admin.id, title: 'Chào mừng', message: 'Hệ thống đã sẵn sàng' },
    { userId: manager.id, title: 'Công việc', message: 'Kiểm tra lịch tuần' },
    { userId: emp1.id, title: 'Thông báo', message: 'Bạn có lịch mới' },
    { userId: emp2.id, title: 'Thông báo', message: 'Bạn có lịch mới' },
    { userId: emp3.id, title: 'Thông báo', message: 'Bạn có lịch mới' },
  ]);

  return true;
}

module.exports = runSeed;
