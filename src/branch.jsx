import React from "react";

import { line } from "d3-shape";

function Branch(props) {
  // const [isHovered, setIsHovered] = React.useState(false);
  const { xScale, yScale, colorScale, showLabel, setTooltip, isCollapsed } = props;
  const { source, target } = props.link;
  
  const source_x = xScale(source.data.abstract_x);
  const source_y = yScale(source.data.abstract_y);
  const target_x = xScale(target.data.abstract_x);
  const target_y = yScale(target.data.abstract_y);
  const tracer_x2 = props.alignTips == "right" ?
    props.width - (target.data.text_width || 0) :
    target_x;
  
  const data = [
    [source_x, source_y],
    [source_x, target_y], 
    [target_x, target_y]
  ];

  const branch_line = line().x(d => d[0]).y(d => d[1]);
  
  const computed_branch_styles = props.branchStyler ?
    props.branchStyler(target.data) :
    target.data.annotation && colorScale ? {
      stroke: colorScale(target.data.annotation)
    } : {};

  const all_branch_styles = Object.assign(
    {}, props.branchStyle, computed_branch_styles
  );

  const label_style = target.data.name && props.labelStyler ?
    props.labelStyler(target.data) : {};


  // const handleNodeClick = (e, nodeData) => {
  //   e.stopPropagation();
  //   if (props.onNodeClick) {
  //     props.onNodeClick({
  //       ...nodeData,
  //       unique_id: source.unique_id  // 使用 source.unique_id
  //     });
  //   }
  // };


  // // 節點樣式
  // const nodeStyle = {
  //   fill: isHovered ? 'grey' : '#ffffff',
  //   r: isHovered ? 5 : 3,
  //   cursor: 'pointer',
  //   stroke: "grey",
  //   strokeWidth: 1.2
  // };

  return (
    <g className="node">
      <path
        className="rp-branch"
        fill="none"
        d={branch_line(data)}
        onClick={() => props.onClick(props.link)}
        {...all_branch_styles}
        onMouseMove={props.tooltip ? e => {
          setTooltip({
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY,
            data: target.data
          });
        } : undefined}
        onMouseOut={props.tooltip ? () => setTooltip(false) : undefined}
      />

      {showLabel && (
        <>
          <line
            x1={target_x}
            x2={tracer_x2}
            y1={target_y}
            y2={target_y}
            className="rp-branch-tracer"
          />
          <text
            x={tracer_x2 + 5}
            y={target_y}
            textAnchor="start"
            alignmentBaseline="middle"
            {...Object.assign({}, props.labelStyle, label_style)}
            className="rp-label"
          >
            {target.data.name.slice(0, props.maxLabelWidth)}
          </text>
        </>
      )}
    </g>
  );
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
