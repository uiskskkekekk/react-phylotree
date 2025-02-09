import { max } from "d3-array";
import { AxisTop } from "d3-react-axis";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeCategory10 } from "d3-scale-chromatic";
import { phylotree } from "phylotree";
import React, { useState } from "react";
import _ from "underscore";

import Branch from "./branch.jsx";
import text_width from "./text_width";


function x_branch_lengths(node, accessor) {
  if (!node.parent) return 0;
  const bl = accessor(node);
  return  bl + node.parent.data.abstract_x;
}

function x_no_branch_lengths(node) {
  return node.parent ? node.parent.data.abstract_x + 1 : 0;
}

function default_accessor(node){   //使用accessor函數獲取分支長度
  return +node.data.attribute;
}

function sort_nodes (tree, direction) {
  tree.traverse_and_compute (function (n) {    //樹的遍歷
    var d = 1;
    if (n.children && n.children.length) {
      d += max (n.children, function (d) { return d["count_depth"];});
    }
    n["count_depth"] = d;
  });
  //使用traverse_and_compute來遍歷樹並計算每個節點的深度
  const asc = direction == "ascending";
  tree.resortChildren (function (a,b) {   //tree.resortChildren() - 重新排序子節點
    return (a["count_depth"] - b["count_depth"]) * (asc ? 1 : -1);
  });
}

function placenodes(tree, perform_internal_layout, accessor, sort) {
  accessor = accessor || default_accessor;
  if(sort) {
    sort_nodes(tree, sort);
  }
  var current_leaf_height = -1,
    unique_id = 0;
  tree.max_x = 0;
  const has_branch_lengths = Boolean(accessor(tree.getTips()[0])),  //tree.getTips() - 獲取所有葉節點
    x_branch_length = has_branch_lengths ? x_branch_lengths : x_no_branch_lengths;
  function node_layout(node) {
    if(!node.unique_id) {
      unique_id = node.unique_id = unique_id + 1;
    }
    node.data.abstract_x = x_branch_length(node, accessor);   //node.data.abstract_x - 為節點添加座標信息
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);  //node.data.abstract_x - 為節點添加座標信息
    if(node.children) {
      node.data.abstract_y = node.children.map(node_layout)
        .reduce( (a,b) => a + b, 0) / node.children.length;
    } else {
      current_leaf_height = node.data.abstract_y = current_leaf_height+1;
    }
    return node.data.abstract_y;
  }

  function internal_node_layout(node) {
    unique_id = node.unique_id = unique_id + 1;
    node.data.abstract_x = x_branch_length(node, accessor);   //node.data.abstract_x - 為節點添加座標信息
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);  //node.data.abstract_x - 為節點添加座標信息
    if(!tree.isLeafNode(node)) {  //tree.isLeafNode() - 判斷是否為葉節點
      node.children.forEach(internal_node_layout);
    }
    if(!node.data.abstract_y && node.data.name != "root") {
      current_leaf_height = node.data.abstract_y = current_leaf_height+1;
      tree.node_order.push(node.data.name);
    }
    if(node.parent && !node.parent.data.abstract_y && node.data.name != "root") {
      if(node.parent.data.name != "root") {
        current_leaf_height = node.parent.data.abstract_y = current_leaf_height+1;
        tree.node_order.push(node.parent.data.name);
      } 
    }
    tree.max_y = Math.max(tree.max_y, current_leaf_height);
  }

  if(perform_internal_layout) {
    tree.max_y = 0;
    tree.node_order = [];
    internal_node_layout(tree.nodes);
    const root = tree.getNodeByName("root");   //tree.getNodeByName("root") - 通過名字查找節點
    root.data.abstract_y = root.children.map(child => child.data.abstract_y)
      .reduce((a,b)=>a+b, 0) / root.children.length;
  } else {
    node_layout(tree.nodes);
    tree.max_y = current_leaf_height;
  }
}


function getColorScale(tree, highlightBranches) {
  if(!highlightBranches) return null;
  if(typeof highlightBranches === "boolean") {
    return tree.parsed_tags && highlightBranches ? 
      scaleOrdinal().domain(tree.parsed_tags).range(schemeCategory10) :
      null;
  }
  const pairs = _.pairs(highlightBranches);
  return scaleOrdinal()
    .domain(pairs.map(p => p[0]))
    .range(pairs.map(p => p[1]));
}

function collectInternalNodes(tree) {
  const internalNodes = new Map(); // 使用 Map 來存儲節點信息
  
  tree.links.forEach(link => {
    const source = link.source;
    if (source.children && source.children.length > 0) {
      // 如果這個源節點還沒被記錄
      if (!internalNodes.has(source.unique_id)) {
        internalNodes.set(source.unique_id, {
          x: source.data.abstract_x,
          y: source.data.abstract_y,
          node: source
        });
      }
    }
  });
  
  return internalNodes;
}

function NodeLabel({ id, x, y, isCollapsed, label, onLabelChange, internalNodeLabels }) {  //merge後重新命名
  const [isEditing, setIsEditing] = useState(false);

  const adjustedX = internalNodeLabels ? x + 35 : x + 10;  // 如果有 internal label 就多移動一些

  // 只有收合的節點才顯示標籤
  if (!isCollapsed) return null;

  return isEditing ? (
    <foreignObject   //雙擊重新命名
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
            setIsEditing(false);  // 按下 Enter 時結束編輯
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
        fontSize: '16px'
      }}
      onClick={e => e.stopPropagation()} // 防止點擊觸發樹的事件
      onDoubleClick={() => setIsEditing(true)}
    >
      {label || 'Double click to name'}
    </text>
  );
}


function Phylotree(props) {
  const [tooltip, setTooltip] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const { width, height, maxLabelWidth } = props;
  const [hoveredNode, setHoveredNode] = useState(null);
  const [nodeLabels, setNodeLabels] = useState(new Map());
  const [editingNode, setEditingNode] = useState(null);  // 需要添加這行

  var{ tree, newick } = props;
  if (!tree && !newick) return <g />;
  if(!tree) tree = new phylotree(newick);
  if(!props.skipPlacement) {
    placenodes(tree, props.internalNodeLabels, props.accessor, props.sort);
  }

  console.log("Tree links structure:", tree.links.map(link => ({
    source: {
      name: link.source.data.name,
      id: link.source.unique_id
    },
    target: {
      name: link.target.data.name,
      id: link.target.unique_id
    }
  })));

  console.log("Node structure:", tree.links[0]);

  

  function getHiddenBranches(collapsedNodes) {
    const hiddenNodes = new Set();
    
    function traverse(node, isParentCollapsed = false) {
      // 只隱藏子節點，不隱藏當前節點
      if (isParentCollapsed) {
        // 如果父節點被收合，隱藏所有子節點
        if (node.children) {
          node.children.forEach(child => {
            hiddenNodes.add(child.unique_id);
            traverse(child, true);
          });
        }
      } else if (collapsedNodes.has(node.unique_id)) {
        // 如果當前節點被收合，只隱藏子節點
        if (node.children) {
          node.children.forEach(child => {
            hiddenNodes.add(child.unique_id);
            traverse(child, true);
          });
        }
      } else if (node.children) {
        // 繼續遍歷未收合的子節點
        node.children.forEach(child => traverse(child, false));
      }
    }
    
    traverse(tree.nodes);
    return hiddenNodes;
  }

  const hiddenBranches = getHiddenBranches(collapsedNodes);

  function shouldHideInternalNode(nodeId, nodeInfo) {
    // 檢查此節點是否在任何收合節點的路徑上
    let currentNode = nodeInfo.node;
    while (currentNode.parent) {
      if (collapsedNodes.has(currentNode.parent.unique_id)) {
        return true;
      }
      currentNode = currentNode.parent;
    }
    return false;
  }


  function attachTextWidth(node) {
    node.data.text_width = text_width(node.data.name, 14, maxLabelWidth);
    if(node.children) node.children.forEach(attachTextWidth);
  }
  attachTextWidth(tree.nodes);
  
  const sorted_tips = tree.getTips().sort((a,b) => 
    b.data.abstract_x - a.data.abstract_x
  );

  var rightmost;
  if (!props.showLabels) {
    rightmost = width;
  } else {
    for(let i=0; i < sorted_tips.length; i++) {
      let tip = sorted_tips[i];
      rightmost = width - tip.data.text_width;
      let scale = rightmost / tip.data.abstract_x;
      let none_cross = sorted_tips.map(tip => {
        const tip_x = tip.data.abstract_x * scale,
          text_x = width - tip.data.text_width,
          this_doesnt_cross = Math.floor(tip_x) < Math.ceil(text_x);
        return this_doesnt_cross;
      }).every(x => x);
      if(none_cross) break;
    }
  }

  const x_scale = scaleLinear()
    .domain([0, tree.max_x])
    .range([0, rightmost]),
  y_scale = scaleLinear()
    .domain([0, tree.max_y])
    .range([props.includeBLAxis ? 60 : 0, height]),
    color_scale = getColorScale(tree, props.highlightBranches);
  
  

  const toggleNode = (nodeData) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeData.unique_id)) {
        next.delete(nodeData.unique_id);
      } else {
        next.add(nodeData.unique_id);
      }
      return next;
    });
  };

  const internalNodes = collectInternalNodes(tree);


  const handleLabelChange = (id, newLabel) => {
    const newLabels = new Map(nodeLabels);
    newLabels.set(id, newLabel);
    setNodeLabels(newLabels);
  };


  return (<g transform={props.transform}>
    {props.includeBLAxis && <g>
      <text
        x={x_scale(tree.max_x/2)}
        y={10}
        alignmentBaseline='middle'
        textAnchor='middle'
        fontFamily='Courier'
      >
        Substitutions per site
      </text>
      <AxisTop transform={`translate(0, 40)`} scale={x_scale} />
    </g>}

    {/* 先渲染所有分支 */}
    {tree.links
      .filter(link => !hiddenBranches.has(link.target.unique_id))
      .map(link => (
        <Branch
          key={`${link.source.unique_id},${link.target.unique_id}`}
          xScale={x_scale}
          yScale={y_scale}
          colorScale={color_scale}
          link={link}
          showLabel={props.internalNodeLabels ||
            (props.showLabels && tree.isLeafNode(link.target))}
          maxLabelWidth={maxLabelWidth}
          width={width}
          alignTips={props.alignTips}
          branchStyler={props.branchStyler}
          labelStyler={props.labelStyler}
          tooltip={props.tooltip}
          setTooltip={setTooltip}
          onClick={props.onBranchClick}
          isCollapsed={collapsedNodes.has(link.target.unique_id)}
        />
      ))}

    
    {/* 渲染所有內部節點 */}
    {Array.from(internalNodes.entries())
      .filter(([id, nodeInfo]) => !shouldHideInternalNode(id, nodeInfo))
      .map(([id, nodeInfo]) => (
        <g
          key={`internal-${id}`}
          className="internal-node"
          transform={`translate(${x_scale(nodeInfo.x)},${y_scale(nodeInfo.y)})`}
          onClick={(e) => {
            e.stopPropagation();
            toggleNode({unique_id: id});
          }}
          onMouseEnter={() => setHoveredNode(id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <circle 
            r={hoveredNode === id ? 5 : 3}
            style={{
              fill: hoveredNode === id ? 'grey' : '#ffffff',
              cursor: 'pointer',
              stroke: "grey",
              strokeWidth: 1.2
            }}
          />
        </g>
      ))}
    
    {/* 單獨渲染標籤 */}
    {Array.from(internalNodes.entries())
      .filter(([id, nodeInfo]) => !shouldHideInternalNode(id, nodeInfo))
      .map(([id, nodeInfo]) => (
        <NodeLabel
          key={`label-${id}`}
          id={id}
          x={x_scale(nodeInfo.x)}  // 位置可以調整
          y={y_scale(nodeInfo.y) + 5}
          isCollapsed={collapsedNodes.has(id)}
          label={nodeLabels.get(id)}
          onLabelChange={handleLabelChange}
          internalNodeLabels={props.internalNodeLabels}  // 傳遞是否顯示 internal label
        />
      ))}
  </g>);
}

Phylotree.defaultProps = {
  width: 500,
  height: 500,
  showLabels: true,
  skipPlacement: false,
  maxLabelWidth: 20,
  alignTips: "right",
  accessor: default_accessor,
  branchStyler: null,
  labelStyler: null,
  tooltip: null,
  sort: null,
  includeBLAxis: false,
  onBranchClick: () => null
};

export default Phylotree;
export {
  placenodes
};
