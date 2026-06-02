import '~/styles/index'
import { registry } from '~/styles/index'

interface StylePickerProps {
  selectedStyleId: string
  onSelect: (styleId: string) => void
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
  preview: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0,
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0,
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
};

const PREVIEW_SIZE = 40;

export function StylePicker({ selectedStyleId, onSelect }: StylePickerProps) {
  const allStyles = registry.list();

  return (
    <div style={styles.grid}>
      {allStyles.map((style) => {
        const isSelected = style.id === selectedStyleId;
        const RedPreview = style.Normal;
        const BlackPreview = style.Normal;

        return (
          <div
            key={style.id}
            style={isSelected ? styles.cardSelected : styles.card}
            onClick={() => onSelect(style.id)}
          >
            <div style={styles.preview}>
              <RedPreview team="red" size={PREVIEW_SIZE} />
              <BlackPreview team="black" size={PREVIEW_SIZE} />
            </div>
            <div style={styles.info}>
              <div style={styles.name}>{style.name}</div>
              <div style={styles.description}>{style.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
