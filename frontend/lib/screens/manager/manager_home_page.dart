import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';

class ManagerHomePage extends StatefulWidget {
  const ManagerHomePage({super.key});

  @override
  State<ManagerHomePage> createState() => _ManagerHomePageState();
}

class _ManagerHomePageState extends State<ManagerHomePage> with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    final api = context.read<ApiService>();
    api.fetchRooms();
    api.fetchEvents();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16.0),
          child: Text('Bảng điều khiển quản lý', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Nhân viên phòng'),
            Tab(text: 'Phòng họp'),
            Tab(text: 'Lịch họp'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tab,
            children: const [
              _DeptEmployeesTab(),
              _RoomsTab(),
              _MeetingsTab(),
            ],
          ),
        ),
      ],
    );
  }
}

class _DeptEmployeesTab extends StatelessWidget {
  const _DeptEmployeesTab();
  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    final me = api.currentUser;
    return FutureBuilder(
      future: api.listUsers(limit: 200, offset: 0),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final users = (snap.data!)
            .where((u) => me?.departmentId != null ? u.departmentId == me!.departmentId : true)
            .toList();
        if (users.isEmpty) return const Center(child: Text('Không có nhân viên trong phòng'));
        return ListView.separated(
          itemCount: users.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (_, i) => ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text(users[i].name),
            subtitle: Text(users[i].email),
          ),
        );
      },
    );
  }
}

class _RoomsTab extends StatelessWidget {
  const _RoomsTab();
  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    final rooms = api.rooms;
    return RefreshIndicator(
      onRefresh: () async => api.fetchRooms(),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        itemCount: rooms.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final r = rooms[i];
          return ListTile(
            leading: const Icon(Icons.meeting_room_outlined),
            title: Text(r.name),
            subtitle: Text([if (r.location != null) r.location!, if (r.capacity != null) 'Sức chứa ${r.capacity}'].join(' • ')),
          );
        },
      ),
    );
  }
}

class _MeetingsTab extends StatefulWidget {
  const _MeetingsTab();
  @override
  State<_MeetingsTab> createState() => _MeetingsTabState();
}

class _MeetingsTabState extends State<_MeetingsTab> {
  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    final events = api.events;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: () async => api.fetchEvents(),
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(12),
          itemCount: events.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final e = events[i];
            return ListTile(
              leading: const Icon(Icons.event_note_outlined),
              title: Text(e.title),
              subtitle: Text('${e.startTime} → ${e.endTime} • ${e.status}'),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openCreateMeeting(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<void> _openCreateMeeting(BuildContext context) async {
    final api = context.read<ApiService>();
    final me = api.currentUser;
    final users = await api.listUsers(limit: 200, offset: 0);
    final deptUsers = (me?.departmentId != null)
        ? users.where((u) => u.departmentId == me!.departmentId).toList()
        : users;
    final rooms = api.rooms;
    final titleCtrl = TextEditingController();
    DateTime? start;
    DateTime? end;
    String? roomId;
    final selected = <String>{};
    await showDialog(context: context, builder: (ctx) {
      return StatefulBuilder(builder: (ctx, setS) {
        return AlertDialog(
          title: const Text('Tạo lịch họp'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Tiêu đề')),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: () async {
                final now = DateTime.now();
                final d = await showDatePicker(context: ctx, firstDate: DateTime(now.year-1), lastDate: DateTime(now.year+2), initialDate: now);
                if (d == null) return; final t = await showTimePicker(context: ctx, initialTime: TimeOfDay.now()); if (t == null) return;
                setS(() => start = DateTime(d.year,d.month,d.day,t.hour,t.minute));
              }, child: Text(start==null? 'Bắt đầu' : start.toString())),
              OutlinedButton(onPressed: () async {
                final now = DateTime.now();
                final d = await showDatePicker(context: ctx, firstDate: DateTime(now.year-1), lastDate: DateTime(now.year+2), initialDate: now);
                if (d == null) return; final t = await showTimePicker(context: ctx, initialTime: TimeOfDay.now()); if (t == null) return;
                setS(() => end = DateTime(d.year,d.month,d.day,t.hour,t.minute));
              }, child: Text(end==null? 'Kết thúc' : end.toString())),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: roomId,
                items: rooms.map((r) => DropdownMenuItem(value: r.id, child: Text(r.name))).toList(),
                onChanged: (v) => setS(() => roomId = v),
                decoration: const InputDecoration(labelText: 'Phòng họp'),
              ),
              const SizedBox(height: 8),
              const Align(alignment: Alignment.centerLeft, child: Text('Chọn người tham gia', style: TextStyle(fontWeight: FontWeight.w600))),
              SizedBox(
                width: 400, height: 200,
                child: ListView(
                  children: deptUsers.map((u) => CheckboxListTile(
                    value: selected.contains(u.id),
                    onChanged: (v) => setS(() { if (v==true) selected.add(u.id); else selected.remove(u.id); }),
                    title: Text(u.name),
                  )).toList(),
                ),
              )
            ]),
          ),
          actions: [
            TextButton(onPressed: ()=> Navigator.pop(ctx), child: const Text('Hủy')),
            ElevatedButton(onPressed: () async {
              if (titleCtrl.text.trim().isEmpty || start==null || end==null) return;
              await api.createEvent(title: titleCtrl.text.trim(), start: start, end: end, roomId: roomId, participantIds: selected.toList());
              if (context.mounted) Navigator.pop(ctx);
            }, child: const Text('Tạo'))
          ],
        );
      });
    });
  }
}
