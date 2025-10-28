import React from 'react';
import { Platform } from 'react-native';
import { SFSymbol } from 'react-native-sfsymbols';
import {
  Plus,
  Minus,
  X,
  Check,
  Shuffle,
  Dice6,
  Trophy,
  Users,
  RotateCcw,
  Pen,
  ListFilter,
  Camera,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Star,
  Baby,
  Brain,
  Loader2,
  ArrowLeft,
  Upload,
  UserPlus,
  Share2,
  Trash2,
  MapPin,
  Copy,
  BarChart3,
  Edit,
  Medal,
  Award,
  Search,
  Info,
  CheckCircle,
  SmilePlus,
  Smile,
  Laugh,
  HelpCircle,
  ThumbsDown,
  ThumbsUp,
  Heart,
  Link as LinkIcon,
  Settings
} from 'lucide-react-native';

// SF Symbols mapping for iOS
const SF_SYMBOLS_MAP = {
  // Basic actions
  'plus': 'plus',
  'minus': 'minus',
  'x': 'xmark',
  'check': 'checkmark',
  'shuffle': 'shuffle',
  'dice6': 'dice',
  'trophy': 'trophy',
  'users': 'person.2',
  'rotateccw': 'arrow.clockwise',
  'pen': 'pencil',
  'listfilter': 'line.3.horizontal.decrease',
  'camera': 'camera',
  'clock': 'clock',
  'chevron-down': 'chevron.down',
  'chevron-up': 'chevron.up',
  'chevron-right': 'chevron.right',
  'chevron-left': 'chevron.left',
  'calendar': 'calendar',
  'star': 'star',
  'baby': 'figure.child',
  'brain': 'brain.head.profile',
  'loader2': 'arrow.clockwise',
  'arrow-left': 'arrow.left',
  'upload': 'square.and.arrow.up',
  'user-plus': 'person.badge.plus',
  'share2': 'square.and.arrow.up',
  'trash2': 'trash',
  'mappin': 'mappin.and.ellipse',
  'copy': 'doc.on.doc',
  'barchart3': 'chart.bar',
  'edit': 'pencil',
  'medal': 'medal',
  'award': 'award',
  'search': 'magnifyingglass',
  'info': 'info.circle',
  'checkcircle': 'checkmark.circle',
  'smileplus': 'face.smiling.plus',
  'smile': 'face.smiling',
  'laugh': 'face.smiling',
  'helpcircle': 'questionmark.circle',
  'thumbsdown': 'hand.thumbsdown',
  'thumbsup': 'hand.thumbsup',
  'heart': 'heart',
  'link': 'link',
  'settings': 'gearshape'
} as const;

// Lucide icon components mapping
const LUCIDE_ICONS = {
  'plus': Plus,
  'minus': Minus,
  'x': X,
  'check': Check,
  'shuffle': Shuffle,
  'dice6': Dice6,
  'trophy': Trophy,
  'users': Users,
  'rotateccw': RotateCcw,
  'pen': Pen,
  'listfilter': ListFilter,
  'camera': Camera,
  'clock': Clock,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'calendar': Calendar,
  'star': Star,
  'baby': Baby,
  'brain': Brain,
  'loader2': Loader2,
  'arrow-left': ArrowLeft,
  'upload': Upload,
  'user-plus': UserPlus,
  'share2': Share2,
  'trash2': Trash2,
  'mappin': MapPin,
  'copy': Copy,
  'barchart3': BarChart3,
  'edit': Edit,
  'medal': Medal,
  'award': Award,
  'search': Search,
  'info': Info,
  'checkcircle': CheckCircle,
  'smileplus': SmilePlus,
  'smile': Smile,
  'laugh': Laugh,
  'helpcircle': HelpCircle,
  'thumbsdown': ThumbsDown,
  'thumbsup': ThumbsUp,
  'heart': Heart,
  'link': LinkIcon,
  'settings': Settings
} as const;

export interface SFSymbolIconProps {
  name: keyof typeof SF_SYMBOLS_MAP;
  size?: number;
  color?: string;
  multicolor?: boolean;
  weight?: 'ultraLight' | 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black';
  scale?: 'small' | 'medium' | 'large';
}

export const SFSymbolIcon: React.FC<SFSymbolIconProps> = ({
  name,
  size = 24,
  color = '#000000',
  multicolor = false,
  weight = 'regular',
  scale = 'medium'
}) => {
  // On iOS, use SF Symbols
  if (Platform.OS === 'ios') {
    const sfSymbolName = SF_SYMBOLS_MAP[name];
    if (sfSymbolName) {
      return (
        <SFSymbol
          name={sfSymbolName}
          size={size}
          color={color}
          multicolor={multicolor}
          weight={weight}
          scale={scale}
        />
      );
    }
  }

  // Fallback to Lucide icons for Android/Web or if SF Symbol not found
  const LucideIcon = LUCIDE_ICONS[name];
  if (LucideIcon) {
    return <LucideIcon size={size} color={color} />;
  }

  // Ultimate fallback
  return <Plus size={size} color={color} />;
};

export default SFSymbolIcon;
