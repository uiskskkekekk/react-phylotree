import { max } from "d3-array";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeCategory10 } from "d3-scale-chromatic";
import { phylotree } from "phylotree";
import React, { useEffect, useRef, useState } from "react";
import _ from "underscore";

import text_width from "../../utils/text_width.js";
import { collectInternalNodes, getHiddenBranches, shouldHideInternalNode } from "../../utils/tree-utils.js";
import BranchLengthAxis from "./BranchLengthAxis.jsx";
import InternalNode from "./InternalNode.jsx";
import NodeLabel from "./NodeLabel.jsx";
import Branch from "./branch.jsx";

import "../../styles/phylotree.css";

function x_branch_lengths(node, accessor) {
  if (!node.parent) return 0;
  const bl = accessor(node);
  return bl + node.parent.data.abstract_x;
}

function x_no_branch_lengths(node) {
  return node.parent ? node.parent.data.abstract_x + 1 : 0;
}

function default_accessor(node) {
  return +node.data.attribute;  //「+」的作用是將其後面的node.data.attribute轉換為數字
}

function sort_nodes(tree, direction) {
  tree.traverse_and_compute(function(n) {
    var d = 1;
    if (n.children && n.children.length) {
      d += max(n.children, function(d) { return d["count_depth"]; });
    }
    n["count_depth"] = d;
  });

  const asc = direction === "ascending";

  tree.resortChildren(function(a, b) {
    return (a["count_depth"] - b["count_depth"]) * (asc ? 1 : -1);
  });
}

function placenodes(tree, perform_internal_layout, accessor, sort) {
  accessor = accessor || default_accessor;

  if (sort) {  //sort內容( ascending:升序 || descending:降序 )
    sort_nodes(tree, sort);
  }

  var current_leaf_height = -1, unique_id = 0;
  tree.max_x = 0;
  
  const has_branch_lengths = Boolean(accessor(tree.getTips()[0])),
    x_branch_length = has_branch_lengths ? x_branch_lengths : x_no_branch_lengths;
  
  function node_layout(node) {
    if (!node.unique_id) {
      unique_id = node.unique_id = unique_id + 1;
    }
    node.data.abstract_x = x_branch_length(node, accessor);
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);
    if (node.children) {
      node.data.abstract_y = node.children.map(node_layout)
        .reduce((a, b) => a + b, 0) / node.children.length;
    } else {
      current_leaf_height = node.data.abstract_y = current_leaf_height + 1;
    }
    return node.data.abstract_y;
  }

  function internal_node_layout(node) {
    unique_id = node.unique_id = unique_id + 1;
    node.data.abstract_x = x_branch_length(node, accessor);
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);
    if (!tree.isLeafNode(node)) {
      node.children.forEach(internal_node_layout);
    }
    if (!node.data.abstract_y && node.data.name !== "root") {
      current_leaf_height = node.data.abstract_y = current_leaf_height + 1;
      tree.node_order.push(node.data.name);
    }
    if (node.parent && !node.parent.data.abstract_y && node.data.name !== "root") {
      if (node.parent.data.name !== "root") {
        current_leaf_height = node.parent.data.abstract_y = current_leaf_height + 1;
        tree.node_order.push(node.parent.data.name);
      }
    }
    tree.max_y = Math.max(tree.max_y, current_leaf_height);
  }

  if (perform_internal_layout) {
    tree.max_y = 0;
    tree.node_order = [];
    internal_node_layout(tree.nodes);
    const root = tree.getNodeByName("root");
    root.data.abstract_y = root.children.map(child => child.data.abstract_y)
      .reduce((a, b) => a + b, 0) / root.children.length;
  } else {
    node_layout(tree.nodes);
    tree.max_y = current_leaf_height;
  }
}

function getColorScale(tree, highlightBranches) {
  if (!highlightBranches) return null;
  if (typeof highlightBranches === "boolean") {
    return tree.parsed_tags && highlightBranches ?
      scaleOrdinal().domain(tree.parsed_tags).range(schemeCategory10) :
      null;
  }
  const pairs = _.pairs(highlightBranches);
  return scaleOrdinal()
    .domain(pairs.map(p => p[0]))
    .range(pairs.map(p => p[1]));
}

function calculateOptimalDimensions(tree) {
  const leafNodes = tree.getTips();
  const minVerticalSpacing = 20;
  
  const optimalHeight = leafNodes.length * minVerticalSpacing;
  
  let maxPathLength = 0;
  let maxLabelWidth = 0;
  
  tree.traverse_and_compute((node) => {
    if (node.data.abstract_x > maxPathLength) {
      maxPathLength = node.data.abstract_x;
    }
    if (node.data.name) {
      const labelWidth = text_width(node.data.name, 14, 100);
      if (labelWidth > maxLabelWidth) {
        maxLabelWidth = labelWidth;
      }
    }
  });

  const minHorizontalSpacing = 25;
  const optimalWidth = (maxPathLength * minHorizontalSpacing) + maxLabelWidth + 100;

  return {
    width: Math.round(optimalWidth),
    height: Math.round(optimalHeight)
  };
}

function Phylotree(props) {
  const [tooltip, setTooltip] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [nodeLabels, setNodeLabels] = useState(new Map());
  const [dimensions, setDimensions] = useState(null);
  const [hoveredTick, setHoveredTick] = useState(null);
  
  const svgRef = useRef(null);
  const { maxLabelWidth, collapsedNodes, renamedNodes, onNodeRename} = props;

  useEffect(() => {
    var tree = props.tree;
    if (!tree && props.newick) {
      tree = new phylotree(props.newick);
    }
    
    if (tree && !props.skipPlacement) {
      placenodes(tree, props.internalNodeLabels, props.accessor, props.sort);

      if (props.onTreeReady) {
        props.onTreeReady(tree);
      }
      
      const optimalDims = calculateOptimalDimensions(tree, props.showLabels);
      if (!dimensions || 
          dimensions.width !== optimalDims.width || 
          dimensions.height !== optimalDims.height) {
        setDimensions(optimalDims);
        if (props.onDimensionsChange) {
          props.onDimensionsChange(optimalDims);
        }
      }
    }
  }, [props.tree, props.newick, props.showLabels, collapsedNodes, props.internalNodeLabels, props.accessor, props.sort, props.onDimensionsChange, dimensions]);
  
  const handleNodeClick = (e, id, nodeInfo) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const isNodeCollapsed = collapsedNodes && collapsedNodes.has(id);
    
    if (props.onContextMenuEvent) {
      props.onContextMenuEvent({
        visible: true,
        position: { x, y },
        nodeId: id,
        nodeData: nodeInfo,
        isNodeCollapsed: isNodeCollapsed
      });
    }
  };

  const handleLabelChange = (id, newLabel) => {
    const newLabels = new Map(nodeLabels);
    newLabels.set(id, newLabel);
    setNodeLabels(newLabels);
    
    // 把名稱更新給PhylotreeApplication
    if (props.onNodeRename) {
      props.onNodeRename(id, newLabel);
    }
  };

  if (!props.tree && !props.newick) return <g />;

  var tree = props.tree;
  if (!tree) tree = new phylotree(props.newick);
  if (!props.skipPlacement) {
    placenodes(tree, props.internalNodeLabels, props.accessor, props.sort);
  }

  const actualWidth = props.width || (dimensions ? dimensions.width : 500);
  const actualHeight = props.height || (dimensions ? dimensions.height : 500);

  function attachTextWidth(node) {
    node.data.text_width = text_width(node.data.name, 14, maxLabelWidth);
    if (node.children) node.children.forEach(attachTextWidth);
  }
  attachTextWidth(tree.nodes);
  
  const sorted_tips = tree.getTips().sort((a, b) => 
    b.data.abstract_x - a.data.abstract_x
  );

  var rightmost;
  if (!props.showLabels) {
    rightmost = actualWidth;
  } else {
    for (let i = 0; i < sorted_tips.length; i++) {
      let tip = sorted_tips[i];
      rightmost = actualWidth - tip.data.text_width;
      let scale = rightmost / tip.data.abstract_x;
      let none_cross = sorted_tips.map(tip => {
        const tip_x = tip.data.abstract_x * scale,
          text_x = actualWidth - tip.data.text_width,
          this_doesnt_cross = Math.floor(tip_x) < Math.ceil(text_x);
        return this_doesnt_cross;
      }).every(x => x);
      if (none_cross) break;
    }
  }

  const x_scale = scaleLinear()
    .domain([0, tree.max_x])
    .range([0, rightmost]);
  const y_scale = scaleLinear()
    .domain([0, tree.max_y])
    .range([props.includeBLAxis ? 90 : 0, actualHeight]);
  
  const color_scale = getColorScale(tree, props.highlightBranches);

  const hiddenBranches = getHiddenBranches(tree, collapsedNodes);
  const internalNodes = collectInternalNodes(tree);

  return (
    <g ref={svgRef} transform={props.transform}>
      {props.includeBLAxis && (
        <BranchLengthAxis
          maxX={tree.max_x}
          x_scale={x_scale}
          rightmost={rightmost}
          hoveredTick={hoveredTick}
          setHoveredTick={setHoveredTick}
          onThresholdCollapse={props.onThresholdCollapse}
        />
      )}

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
            width={actualWidth}
            alignTips={props.alignTips}
            branchStyler={props.branchStyler}
            labelStyler={props.labelStyler}
            tooltip={props.tooltip}
            setTooltip={setTooltip}
            onClick={props.onBranchClick}
            isCollapsed={collapsedNodes && collapsedNodes.has(link.target.unique_id)}
          />
        ))}
      
      {Array.from(internalNodes.entries())
        .filter(([id, nodeInfo]) => !shouldHideInternalNode(id, nodeInfo, collapsedNodes))
        .map(([id, nodeInfo]) => (
          <InternalNode
            key={`internal-${id}`}
            id={id}
            x={x_scale(nodeInfo.x)}
            y={y_scale(nodeInfo.y)}
            isHovered={hoveredNode === id}
            onNodeClick={(e) => handleNodeClick(e, id, nodeInfo)}
            onMouseEnter={() => setHoveredNode(id)}
            onMouseLeave={() => setHoveredNode(null)}
          />
        ))}
      
      {Array.from(internalNodes.entries())
        .filter(([id, nodeInfo]) => !shouldHideInternalNode(id, nodeInfo, collapsedNodes))
        .map(([id, nodeInfo]) => (
          <NodeLabel
            key={`label-${id}`}
            id={id}
            x={x_scale(nodeInfo.x)}
            y={y_scale(nodeInfo.y) + 5}
            isCollapsed={collapsedNodes && collapsedNodes.has(id)}
            label={nodeLabels.get(id)}
            onLabelChange={handleLabelChange}
            internalNodeLabels={props.internalNodeLabels}
            onNodeRename={onNodeRename}
          />
        ))}
    </g>
  );
}

Phylotree.defaultProps = {
  showLabels: true,
  skipPlacement: false,
  maxLabelWidth: 20,
  alignTips: "left",
  accessor: default_accessor,
  branchStyler: null,
  labelStyler: null,
  tooltip: null,
  sort: null,
  includeBLAxis: false,
  onBranchClick: () => null,
  onContextMenuEvent: null,
  onNodeClick: null,
  collapsedNodes: new Set(),
  renamedNodes: new Map(),
  onNodeRename: null
};

export default Phylotree;
export {
  calculateOptimalDimensions, placenodes
};
