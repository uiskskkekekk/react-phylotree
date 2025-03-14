import React, { useState } from "react";

/**
 * NodeLabel component for displaying and editing labels of phylogenetic tree nodes
 * 
 * @param {Object} props - Component properties
 * @param {string} props.id - Unique identifier for the node
 * @param {number} props.x - X coordinate for the label position
 * @param {number} props.y - Y coordinate for the label position
 * @param {boolean} props.isCollapsed - Whether the node is in collapsed state
 * @param {string} props.label - Current label text
 * @param {function} props.onLabelChange - Callback when label changes
 * @param {boolean} props.internalNodeLabels - Whether to show internal node labels
 */
function NodeLabel({ id, x, y, isCollapsed, label, onLabelChange, internalNodeLabels }) {
  const [isEditing, setIsEditing] = useState(false);

  const adjustedX = internalNodeLabels ? x + 35 : x + 10; // 如果有 internal label 就多移動一些

  // 只有收合的節點才顯示標籤
  if (!isCollapsed) return null;

  return isEditing ? (
    <foreignObject
      x={adjustedX}
      y={y - 15}
      width="100"
      height="20"
      onClick={e => e.stopPropagation()} // 防止點擊觸發樹的事件
    >
      <input
        type="text"
        value={label || ''}
        onChange={e => onLabelChange(id, e.target.value)}
        onBlur={() => setIsEditing(false)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            setIsEditing(false); // press Enter to end editing
          }
        }}
        autoFocus
        style={{
          border: '1px solid #ccc',
          borderRadius: '3px',
          padding: '2px 5px'
        }}
      />
    </foreignObject>
  ) : (
    <text
      x={adjustedX}
      y={y}
      style={{ 
        cursor: 'pointer',
        fontSize: '16px',
        userSelect: 'none'
      }}
      onClick={e => e.stopPropagation()} // 防止點擊觸發樹的事件
      onDoubleClick={() => setIsEditing(true)}
    >
      {label || 'Double click to name'}
    </text>
  );
}

export default NodeLabel;