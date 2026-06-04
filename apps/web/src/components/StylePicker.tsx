import '~/styles/index'
import { registry } from '~/styles/index'

interface StylePickerProps {
  selectedStyleId: string
  onSelect: (styleId: string) => void
  ownedStyleIds?: string[]
  onPurchase?: (styleId: string) => void
}

const styles = {
  grid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  card: {
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    backgroundColor: '#fafafa',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  cardSelected: {
    border: '2px solid #000',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  cardLocked: {
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    cursor: 'default',
    backgroundColor: '#fafafa',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    opacity: 0.6,
    position: 'relative' as const,
  },
  preview: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0,
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0,
    flex: 1,
  },
  name: {
    fontWeight: 'bold' as const,
    fontSize: '0.95rem',
  },
  description: {
    fontSize: '0.8rem',
    color: '#555',
    marginTop: '0.1rem',
  },
  buyButton: {
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    padding: '0.25rem 0.75rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
};

const PREVIEW_SIZE = 40;

export function StylePicker({ selectedStyleId, onSelect, ownedStyleIds, onPurchase }: StylePickerProps) {
  const allStyles = registry.list();
  const owned = ownedStyleIds ?? ['classic'];

  return (
    <div style={styles.grid}>
      {allStyles.map((style) => {
        const isOwned = owned.includes(style.id);
        const isLocked = !isOwned;
        const isSelected = style.id === selectedStyleId && isOwned;
        const RedPreview = style.Normal;
        const BlackPreview = style.Normal;

        return (
          <div
            key={style.id}
            style={isLocked ? styles.cardLocked : (isSelected ? styles.cardSelected : styles.card)}
            onClick={() => isOwned && onSelect(style.id)}
          >
            <div style={styles.preview}>
              <RedPreview team="red" size={PREVIEW_SIZE} />
              <BlackPreview team="black" size={PREVIEW_SIZE} />
            </div>
            <div style={styles.info}>
              <div style={styles.name}>{style.name}</div>
              <div style={styles.description}>{style.description}</div>
            </div>
            {isLocked && (
              <button
                style={styles.buyButton}
                onClick={(e) => { e.stopPropagation(); onPurchase?.(style.id) }}
              >
                Buy $2
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
