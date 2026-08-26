import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconProps = {
  size?: number;
  color: string;
};

const STROKE = 1.9;

export function SearchIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={STROKE} />
      <Line
        x1={16.2}
        y1={16.2}
        x2={21}
        y2={21}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5.5} x2={12} y2={18.5} stroke={color} strokeWidth={2.3} strokeLinecap="round" />
      <Line x1={5.5} y1={12} x2={18.5} y2={12} stroke={color} strokeWidth={2.3} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={18} y1={6} x2={6} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="5,12.5 10,17.5 19,7"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClockIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={STROKE} />
      <Polyline
        points="12,6.5 12,12 16,14.5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BackIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="14.5,5 7.5,12 14.5,19"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PencilIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 3.8 20.2 7.5 8.4 19.3 3.9 20.1 4.7 15.6Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrashIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={6.5} x2={20} y2={6.5} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Path
        d="M6.5 6.5 7.5 20 16.5 20 17.5 6.5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 6.5 9.5 4 14.5 4 14.5 6.5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PhotoIcon({ size = 30, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={3} stroke={color} strokeWidth={1.7} />
      <Circle cx={8.5} cy={10} r={1.8} stroke={color} strokeWidth={1.7} />
      <Path
        d="M3.5 16.5 8.5 12 12.5 15.5 16 12.5 20.5 16.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SlidersIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={3.5} y1={8} x2={20.5} y2={8} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx={15} cy={8} r={2.9} stroke={color} strokeWidth={STROKE} fill="none" />
      <Line x1={3.5} y1={16} x2={20.5} y2={16} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx={9} cy={16} r={2.9} stroke={color} strokeWidth={STROKE} fill="none" />
    </Svg>
  );
}

export function GridIcon({ size = 23, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={STROKE} />
      <Rect x={13} y={3.5} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={STROKE} />
      <Rect x={3.5} y={13} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={STROKE} />
      <Rect x={13} y={13} width={7.5} height={7.5} rx={2} stroke={color} strokeWidth={STROKE} />
    </Svg>
  );
}

export function ChecklistIcon({ size = 23, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="3.5,7 5.5,9 9,5"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="3.5,17 5.5,19 9,15"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={12.5} y1={7} x2={20.5} y2={7} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Line
        x1={12.5}
        y1={17}
        x2={20.5}
        y2={17}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Round tick used in the recipe detail's ingredient list. */
export function CheckCircle({ size = 20, color, filled }: IconProps & { filled: boolean }) {
  if (!filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8.6} stroke={color} strokeWidth={1.8} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.5} fill={color} />
      <Polyline
        points="7.5,12.2 10.6,15.3 16.5,8.9"
        stroke="#FFFFFF"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Square tick used in the ingredients checklist. */
export function CheckBox({
  size = 22,
  color,
  emptyColor,
  checked,
}: IconProps & { emptyColor: string; checked: boolean }) {
  if (!checked) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x={3.4} y={3.4} width={17.2} height={17.2} rx={5.4} stroke={emptyColor} strokeWidth={1.8} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={2.5} width={19} height={19} rx={6} fill={color} />
      <Polyline
        points="7.2,12.2 10.4,15.4 16.8,8.6"
        stroke="#FFFFFF"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Stand-in artwork for a recipe with no photo yet. */
export function DishPlaceholder({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.3} />
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={1.3} />
    </Svg>
  );
}
