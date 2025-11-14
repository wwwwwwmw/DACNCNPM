import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import 'notification_detail_page.dart';
import '../tasks/task_detail_page.dart';
import '../schedule/event_detail_page.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    final list = api.notifications;
    return RefreshIndicator(
      onRefresh: () async => api.fetchNotifications(),
      child: ListView.separated(
        itemBuilder: (_, i) {
          final n = list[i];
          return ListTile(
            leading: Icon(n.isRead ? Icons.notifications_none : Icons.notifications_active),
            title: Text(n.title),
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(n.message, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              if (n.refType == 'task' || n.refType == 'event')
                Wrap(spacing: 8, children: [
                  if (n.refType == 'task')
                    OutlinedButton.icon(icon: const Icon(Icons.task_alt, size: 18), label: const Text('Xem công việc'), onPressed: () async {
                      try {
                        final task = await api.fetchTaskById(n.refId!);
                        // ignore: use_build_context_synchronously
                        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => TaskDetailPage(task: task)));
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Không mở được công việc: $e')));
                      }
                    }),
                  if (n.refType == 'event')
                    OutlinedButton.icon(icon: const Icon(Icons.event, size: 18), label: const Text('Xem lịch công tác'), onPressed: () async {
                      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventDetailPage(eventId: n.refId!)));
                    }),
                ])
            ]),
            trailing: Text('${n.createdAt.hour.toString().padLeft(2,'0')}:${n.createdAt.minute.toString().padLeft(2,'0')}'),
            onTap: () async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => NotificationDetailPage(notification: n)));
              await api.fetchNotifications();
            },
            isThreeLine: true,
          );
        },
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemCount: list.length,
      ),
    );
  }
}
