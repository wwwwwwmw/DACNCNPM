import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:percent_indicator/percent_indicator.dart';
import '../../services/api_service.dart';
import '../../models/task.dart';
import 'task_detail_page.dart';
import 'add_task_page.dart';
import 'projects_page.dart';
import 'task_status_page.dart';

class HomeTasksPage extends StatefulWidget {
  const HomeTasksPage({super.key});

  @override
  State<HomeTasksPage> createState() => _HomeTasksPageState();
}

class _HomeTasksPageState extends State<HomeTasksPage> {
  @override
  void initState() {
    super.initState();
    final api = context.read<ApiService>();
    api.fetchTasks();
    api.fetchProjects();
    api.fetchTaskStats();
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    final tasks = api.tasks;
    final stats = api.taskStats;
    final total = stats['todo']! + stats['in_progress']! + stats['completed']!;
    final completedPct = total == 0 ? 0.0 : stats['completed']! / total;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(_greeting(), style: const TextStyle(fontSize: 14, color: Colors.grey)),
                  const SizedBox(height:4),
                  const Text('Let\'s make a habits\nTogether 🙌', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold))
                ]),
                IconButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TaskStatusPage())), icon: const Icon(Icons.pie_chart_outline))
              ],
            ),
            const SizedBox(height: 16),
            _ProgressCard(completedPct: completedPct, stats: stats),
            const SizedBox(height: 24),
            const Text('In Progress', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ...tasks.where((t) => t.status != 'completed').map((t) => _TaskItem(task: t)),
            if (tasks.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Chưa có task'))),
          ],
        ),
      ),
      floatingActionButton: (api.currentUser != null && api.currentUser!.role != 'employee')
          ? _FabMenu(onAddTask: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddTaskPage()));
            }, onProjects: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ProjectsPage()));
            })
          : null,
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  }
}

class _ProgressCard extends StatelessWidget {
  final double completedPct;
  final Map<String,int> stats;
  const _ProgressCard({required this.completedPct, required this.stats});
  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 0,
      color: const Color(0xFF2D9CDB),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Application Design', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('Progress ${(completedPct*100).round()}%', style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 12),
          LinearPercentIndicator(
            lineHeight: 10,
            percent: completedPct.clamp(0,1),
            backgroundColor: Colors.white24,
            progressColor: Colors.white,
            barRadius: const Radius.circular(8),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _StatDot(color: Colors.white, label: 'Completed', value: stats['completed']!.toString()),
              const SizedBox(width: 12),
              _StatDot(color: Colors.white70, label: 'In Progress', value: stats['in_progress']!.toString()),
              const SizedBox(width: 12),
              _StatDot(color: Colors.white30, label: 'To Do', value: stats['todo']!.toString()),
            ],
          )
        ]),
      ),
    );
  }
}

class _StatDot extends StatelessWidget {
  final Color color; final String label; final String value;
  const _StatDot({required this.color, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Container(width: 10, height:10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width:4),
      Text('$label $value', style: const TextStyle(color: Colors.white, fontSize: 11)),
    ]);
  }
}

class _TaskItem extends StatelessWidget {
  final TaskModel task;
  const _TaskItem({required this.task});
  @override
  Widget build(BuildContext context) {
    final acceptedCount = task.assignments.where((a) => a.status == 'accepted' || a.status == 'completed').length;
    final isFull = acceptedCount >= task.capacity;
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => TaskDetailPage(task: task))),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(task.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          if (task.description != null) Text(task.description!, maxLines:2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 6),
          Row(children: [
            Chip(label: Text(task.assignmentType)),
            const SizedBox(width: 8),
            Chip(label: Text('${acceptedCount}/${task.capacity}')),
            if (isFull) ...[
              const SizedBox(width: 8),
              Chip(label: const Text('Đủ người'), backgroundColor: Color(0xFFE8F5E9)),
            ]
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Icon(task.status=='completed'?Icons.check_circle:Icons.play_circle_fill, color: const Color(0xFF2D9CDB)),
            const SizedBox(width: 6),
            Text(task.status.replaceAll('_',' ').toUpperCase(), style: const TextStyle(fontSize: 12,color: Colors.black54)),
          ])
        ]),
      ),
    );
  }
}

class _FabMenu extends StatelessWidget {
  final VoidCallback onAddTask; final VoidCallback onProjects;
  const _FabMenu({required this.onAddTask, required this.onProjects});
  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(onPressed: () {
      showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))), builder: (_) => _AddSheet(onAddTask: onAddTask, onProjects: onProjects));
    }, child: const Icon(Icons.add));
  }
}

class _AddSheet extends StatelessWidget {
  final VoidCallback onAddTask; final VoidCallback onProjects;
  const _AddSheet({required this.onAddTask, required this.onProjects});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(onTap: () { Navigator.pop(context); onAddTask(); }, leading: const Icon(Icons.task_alt), title: const Text('Create Task')),
        ListTile(onTap: () { Navigator.pop(context); onProjects(); }, leading: const Icon(Icons.workspaces), title: const Text('Projects')),
      ]),
    );
  }
}
