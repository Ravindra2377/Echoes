import React from "react";
import { Loader2 } from "lucide-react";

export const AppButton = ({
  label,
  onPress,
  icon: Icon,
  variant = "primary", // primary | secondary | ghost | danger
  pill = true,
  disabled = false,
  loading = false,
  style = {},
  className = "",
  testID,
  children,
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case "secondary":
        return "app-btn-secondary";
      case "ghost":
        return "bg-transparent hover:bg-neutral-100 text-ink";
      case "danger":
        return "bg-red-500 hover:bg-red-600 text-white";
      default:
        return "app-btn-primary";
    }
  };

  return (
    <button
      onClick={onPress}
      disabled={disabled || loading}
      className={`app-btn ${getVariantClass()} ${pill ? "app-btn-pill" : ""} ${className}`}
      style={style}
      data-testid={testID}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-1" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {label || children}
    </button>
  );
};

export const TextField = ({
  icon: Icon,
  value,
  onChangeText,
  onChange,
  placeholder,
  type = "text",
  secureTextEntry = false,
  rightAccessory,
  className = "",
  style = {},
  testID,
  autoComplete,
}) => {
  const handleChange = (e) => {
    if (onChangeText) onChangeText(e.target.value);
    if (onChange) onChange(e);
  };

  return (
    <div className={`text-field-container ${className}`} style={style}>
      {Icon && <Icon className="w-5 h-5 text-[var(--ink-faint)] shrink-0" />}
      <input
        type={secureTextEntry ? "password" : type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="text-field-input"
        data-testid={testID}
        autoComplete={autoComplete}
      />
      {rightAccessory && <div className="shrink-0">{rightAccessory}</div>}
    </div>
  );
};

export const SurfaceCard = ({ children, className = "", style = {}, onClick }) => {
  const hasPadding = /\bp-|\bpx-|\bpy-/.test(className);
  return (
    <div
      onClick={onClick}
      className={`surface-card ${hasPadding ? "" : "p-4 sm:p-5"} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export const PillBadge = ({ children, color = "primary", icon: Icon, className = "" }) => {
  const getColorStyles = () => {
    switch (color) {
      case "spotify":
        return "bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20";
      case "ytmusic":
        return "bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/20";
      case "amazon":
        return "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20";
      case "coriander":
        return "bg-[var(--coriander-soft)] text-[var(--coriander)] border-[var(--coriander)]/20";
      case "turmeric":
        return "bg-[var(--turmeric-soft)] text-[var(--turmeric)] border-[var(--turmeric)]/20";
      case "tomato":
        return "bg-[var(--tomato-soft)] text-[var(--tomato)] border-[var(--tomato)]/20";
      default:
        return "bg-[var(--aubergine-soft)] text-[var(--primary)] border-[var(--primary)]/20";
    }
  };

  return (
    <span
      className={`pill-badge border text-xs font-semibold ${getColorStyles()} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
          <h3 className="font-fraunces text-xl font-bold text-[var(--ink)]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--card-alt)] transition"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
