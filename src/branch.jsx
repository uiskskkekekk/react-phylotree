import React, { useState } from 'react';

import { line } from "d3-shape";

/*
樹枝相關
*/
function Branch(props) {

  const { xScale, yScale, colorScale, showLabel, setTooltip } = props;
  const { source, target } = props.link;
  
  // [保留] 原有的座標計算
  const source_x = xScale(source.data.abstract_x);
  const source_y = yScale(source.data.abstract_y);
  const target_x = xScale(target.data.abstract_x);
  const target_y = yScale(target.data.abstract_y);
  const tracer_x2 = props.alignTips == "right" ? 
    props.width - (target.data.text_width || 0) : target_x;

  // [保留] 原有的線條資料計算
  const data = [
    [source_x, source_y],
    [source_x, target_y],
    [target_x, target_y]
  ];
  
  // [保留] 原有的line和style設置
  const branch_line = line()
    .x(d=>d[0])
    .y(d=>d[1]);

  // [保留] 原有的樣式計算邏輯
  const computed_branch_styles = props.branchStyler ?
    props.branchStyler(target.data) :
    target.data.annotation && colorScale ? {
      stroke: colorScale(target.data.annotation)
    } : {};

  const all_branch_styles = Object.assign(
    {}, props.branchStyle, computed_branch_styles
  );

  // [新增] 右鍵選單狀態
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // [新增] 處理右鍵點擊
  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
    setMenuPosition({
      x: e.clientX,
      y: e.clientY  
    });
  };

  // [新增] 處理合併操作
  const handleMerge = () => {
    // 合併邏輯...
  };

  return (<g className="node"
  >
    <path
        className="rp-branch"
        fill="none"
        d={branch_line(data)}
        onContextMenu={handleContextMenu}  // [新增] 右鍵事件
        {...all_branch_styles}
        onMouseMove={props.tooltip ? e => {
          setTooltip({
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY,
            data: target.data
          });
        } : undefined}
        onMouseOut={props.tooltip ? e => {
          setTooltip(false);
        } : undefined}
      />
    {showLabel ? <line  //數節點虛線
      x1={target_x}
      x2={tracer_x2}
      y1={target_y}
      y2={target_y}
      className="rp-branch-tracer"
    /> : null}
    {showLabel ? <text
      x={tracer_x2 + 5}
      y={target_y}
      textAnchor="start"
      alignmentBaseline="middle"
      {...Object.assign({}, props.labelStyle)}
      className="rp-label"
    >{target.data.name}</text> : null}
    {showMenu && (
      <foreignObject
        x={menuPosition.x}
        y={menuPosition.y}
        width={150}
        height={200}
      >
        <div className="branch-context-menu">
          <div onClick={handleMerge}>
            Merge Subtree
          </div>
          {/* 其他選單選項... */}
        </div>
      </foreignObject>  
    )}
  </g>);
}

Branch.defaultProps = {
  branchStyle: {
    strokeWidth: 2,
    stroke: "grey"
  },
  labelStyle: {
  }
}

export default Branch;
