// ignore_for_file: use_build_context_synchronously
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../models/task.dart';
import '../../models/department.dart';

class AddTaskPage extends StatefulWidget {
  final TaskModel? editing;
  final String? preselectedProjectId;
  const AddTaskPage({super.key, this.editing, this.preselectedProjectId});

  @override
  State<AddTaskPage> createState() => _AddTaskPageState();
}

class _AddTaskPageState extends State<AddTaskPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  DateTime? _start;
  DateTime? _end;
  String _status = 'todo';
  String _priority = 'normal';
  String _assignmentType = 'open';
  int _capacity = 1;
  String? _departmentId; // admin can choose; manager defaults
  List<DepartmentModel> _departments = const [];
  String? _projectId;
  String? _assigneeId; // for direct assign at creation/update (manager/admin)
  List<Map<String,String>> _deptUsers = const [];

  @override
  void initState() {
    super.initState();
  final t = widget.editing;
    if (t != null) {
      _titleCtrl.text = t.title;
      _descCtrl.text = t.description ?? '';
      _start = t.startTime;
      _end = t.endTime;
      _status = t.status;
      _priority = t.priority;
      _assignmentType = t.assignmentType;
      _capacity = t.capacity;
      _departmentId = t.departmentId;
    }
    // Preload departments for admin selection
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final api = context.read<ApiService>();
      final me = api.currentUser;
      await api.fetchProjects();
      if (widget.preselectedProjectId != null) {
        _projectId = widget.preselectedProjectId;
      }
      if (me != null && me.role == 'admin') {
        await api.fetchDepartments();
        setState(() { _departments = api.departments; });
      } else if (me != null && me.role == 'manager') {
        _departmentId = me.departmentId;
      }
      // project prefill when editing
      if (widget.editing != null && widget.editing!.project != null) {
        _projectId = widget.editing!.project!.id;
      }
      // preload dept users for direct assign
      if (me != null && (me.role == 'manager' || me.role == 'admin')) {
        final users = await api.listUsers(limit: 200, offset: 0);
        final filtered = (me.role == 'manager' && me.departmentId != null)
            ? users.where((u) => u.departmentId == me.departmentId).toList()
            : users;
        setState(() {
          _deptUsers = filtered.map((u) => {'id': u.id, 'name': u.name}).toList();
        });
      }
    });
  }

  Future<void> _pickDate(bool isStart) async {
    final now = DateTime.now();
    final date = await showDatePicker(context: context, firstDate: DateTime(now.year-1), lastDate: DateTime(now.year+2), initialDate: (_start ?? now));
    if (date == null) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
    if (time == null) return;
    final dt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
  setState(() { if (isStart) { _start = dt; } else { _end = dt; } });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final api = context.read<ApiService>();
    if (widget.editing == null) {
      final task = await api.createTask(
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        start: _start,
        end: _end,
        status: _status,
        priority: _priority,
        projectId: _projectId,
        assignmentType: _assignmentType,
        capacity: _capacity,
        departmentId: _departmentId,
      );
      if (_assignmentType == 'direct' && _assigneeId != null) {
        await api.assignTask(task.id, _assigneeId!);
      }
    } else {
      await api.updateTask(
        widget.editing!.id,
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        start: _start,
        end: _end,
        status: _status,
        priority: _priority,
        projectId: _projectId,
        assignmentType: _assignmentType,
        capacity: _capacity,
      );
      if (_assignmentType == 'direct' && _assigneeId != null) {
        await api.assignTask(widget.editing!.id, _assigneeId!);
      }
    }
    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.editing==null? 'Add Task':'Edit Task')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(children: [
            TextFormField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Task Name'), validator: (v)=> v==null||v.isEmpty? 'Required':null),
            const SizedBox(height:12),
            TextFormField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines:3),
            const SizedBox(height:12),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: ()=>_pickDate(true), child: Text(_start==null? 'Start Time': _start.toString()))),
              const SizedBox(width:8),
              Expanded(child: OutlinedButton(onPressed: ()=>_pickDate(false), child: Text(_end==null? 'End Time': _end.toString()))),
            ]),
            const SizedBox(height:12),
            // Project selection (required)
            Builder(builder: (ctx) {
              final api = context.watch<ApiService>();
              final items = api.projects
                  .map((p) => DropdownMenuItem<String>(value: p.id, child: Text(p.name)))
                  .toList();
              final isLocked = widget.preselectedProjectId != null;
              return DropdownButtonFormField<String>(
                value: _projectId,
                items: items,
                onChanged: isLocked ? null : (v) => setState(()=> _projectId = v),
                validator: (v)=> v==null? 'Chọn project trước khi tạo task': null,
                decoration: const InputDecoration(labelText: 'Project'),
              );
            }),
            const SizedBox(height:12),
            DropdownButtonFormField(initialValue: _status, items: const [
              DropdownMenuItem(value: 'todo', child: Text('To Do')),
              DropdownMenuItem(value: 'in_progress', child: Text('In Progress')),
              DropdownMenuItem(value: 'completed', child: Text('Completed')),
            ], onChanged: (v)=> setState(()=> _status = v as String), decoration: const InputDecoration(labelText: 'Status')),
            const SizedBox(height:12),
            DropdownButtonFormField(initialValue: _priority, items: const [
              DropdownMenuItem(value: 'low', child: Text('Low')),
              DropdownMenuItem(value: 'normal', child: Text('Normal')),
              DropdownMenuItem(value: 'high', child: Text('High')),
              DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
            ], onChanged: (v)=> setState(()=> _priority = v as String), decoration: const InputDecoration(labelText: 'Priority')),
            const SizedBox(height:12),
            DropdownButtonFormField(
              value: _assignmentType,
              items: const [
                DropdownMenuItem(value: 'open', child: Text('Open (self-apply)')),
                DropdownMenuItem(value: 'direct', child: Text('Direct (assign)')),
              ],
              onChanged: (v) => setState(() => _assignmentType = v as String),
              decoration: const InputDecoration(labelText: 'Assignment Type'),
            ),
            const SizedBox(height:12),
            TextFormField(
              initialValue: _capacity.toString(),
              decoration: const InputDecoration(labelText: 'Capacity (slots)'),
              keyboardType: TextInputType.number,
              onChanged: (v) {
                final n = int.tryParse(v.trim());
                setState(() { _capacity = (n == null || n < 1) ? 1 : n; });
              },
            ),
            if (_assignmentType == 'direct') ...[
              const SizedBox(height: 12),
              Builder(builder: (ctx){
                final me = context.read<ApiService>().currentUser;
                if (me == null || (me.role != 'manager' && me.role != 'admin')) return const SizedBox.shrink();
                return DropdownButtonFormField<String>(
                  value: _assigneeId,
                  items: _deptUsers.map((u) => DropdownMenuItem(value: u['id']!, child: Text(u['name']!))).toList(),
                  onChanged: (v) => setState(()=> _assigneeId = v),
                  decoration: const InputDecoration(labelText: 'Assign to (department)'),
                );
              })
            ],
            const SizedBox(height:12),
            Builder(builder: (ctx) {
              final api = context.read<ApiService>();
              final me = api.currentUser;
              if (me != null && me.role == 'admin') {
                return DropdownButtonFormField<String>(
                  value: _departmentId,
                  items: _departments.map((d) => DropdownMenuItem(value: d.id, child: Text(d.name))).toList(),
                  onChanged: (v) => setState(() => _departmentId = v),
                  decoration: const InputDecoration(labelText: 'Department (admin only)'),
                );
              }
              return const SizedBox.shrink();
            }),
            const SizedBox(height:24),
            ElevatedButton(onPressed: _save, child: const Text('Save'))
          ]),
        ),
      ),
    );
  }
}
