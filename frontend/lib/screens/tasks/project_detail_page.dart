import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../models/task.dart';
import 'add_task_page.dart';
import 'task_detail_page.dart';

class ProjectDetailPage extends StatefulWidget {
  final String projectId;
  final String projectName;
  const ProjectDetailPage({super.key, required this.projectId, required this.projectName});

  @override
  State<ProjectDetailPage> createState() => _ProjectDetailPageState();
}

class _ProjectDetailPageState extends State<ProjectDetailPage> {
  List<TaskModel> _tasks = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<ApiService>();
    final list = await api.listTasksForProject(widget.projectId);
    if (!mounted) return;
    setState(() { _tasks = list; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<ApiService>().currentUser;
    return Scaffold(
      appBar: AppBar(title: Text(widget.projectName)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _tasks.isEmpty
              ? const Center(child: Text('Chưa có task trong project này'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tasks.length,
                  itemBuilder: (_, i) {
                    final t = _tasks[i];
                    return Card(
                      child: ListTile(
                        title: Text(t.title),
                        subtitle: Text(t.status.replaceAll('_',' ')),
                        trailing: Text(t.priority),
                        onTap: () async {
                          await Navigator.push(context, MaterialPageRoute(builder: (_) => TaskDetailPage(task: t)));
                          await _load();
                        },
                      ),
                    );
                  },
                ),
      floatingActionButton: (me != null && me.role != 'employee')
          ? FloatingActionButton(
              onPressed: () async {
                await Navigator.push(context, MaterialPageRoute(builder: (_) => AddTaskPage(preselectedProjectId: widget.projectId)));
                await _load();
              },
              child: const Icon(Icons.add_task),
            )
          : null,
    );
  }
}
