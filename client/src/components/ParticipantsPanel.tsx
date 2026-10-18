import { useBoardStore } from '../store/board';

export function ParticipantsPanel() {
  const participants = useBoardStore((s) => s.participants);
  const cursors = useBoardStore((s) => s.cursors);

  // Собираем уникальных участников: те, что в списке + те, чьи курсоры мы видим
  const allUsers = Array.from(
    new Map([
      ...participants.map((p) => [p.socketId, p] as const),
      ...Array.from(cursors.values()).map((c) => [
        c.socketId,
        { socketId: c.socketId, userName: c.userName, color: c.color },
      ] as const),
    ]).values(),
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        minWidth: 180,
        maxWidth: 240,
        maxHeight: 300,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#888',
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        Участники ({allUsers.length})
      </div>

      {allUsers.length === 0 ? (
        <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>
          Только вы
        </div>
      ) : (
        allUsers.map((user) => (
          <div
            key={user.socketId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={user.userName}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: user.color,
                flexShrink: 0,
              }}
            />
            {user.userName}
          </div>
        ))
      )}
    </div>
  );
}