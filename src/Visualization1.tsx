import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Activity, Zap, Layers } from 'lucide-react';

// --- Constants & Color Scales ---
const GRADE_COLORS = {
  'A': '#038141', // Dark Green
  'B': '#85BB2F', // Light Green
  'C': '#FECB02', // Yellow
  'D': '#EE8100', // Orange
  'E': '#E63E11', // Red
};


// --- Math Helpers ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
const easeCubicInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const project3D = (x: number, y: number, z: number, angleDeg: number, pivotX: number, pivotY: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  
  // Rotate around Y axis (Category Axis)
  const rotX = x * Math.cos(rad) - z * Math.sin(rad);
  const rotZ = z * Math.cos(rad) + x * Math.sin(rad); 

  // Perspective Projection - increased further to keep all axes visible and fit screen
  const PERSPECTIVE = 4000;
  const scale = PERSPECTIVE / (PERSPECTIVE + rotZ); 
  
  return {
    x: pivotX + rotX * scale,
    y: pivotY + (y - pivotY) * scale,
    scale: scale,
    z: rotZ 
  };
};


// --- Main Visualization Component ---
const Visualization1 = ({ preAnswers, data, scrollProgress: externalScrollProgress, onComplete }: { 
  preAnswers: Record<number, string>, 
  data: any[], 
  scrollProgress?: number,
  onComplete?: () => void 
}) => {
  const [activeStage, setActiveStage] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Use fixed container height (800px) to fit within the Chapter 2 box
  const [containerHeight, setContainerHeight] = useState(800);
  
  // Update height to match container
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          if (rect.height > 0) {
            setContainerHeight(rect.height);
          }
        }
      }
    };
    
    // Small delay to ensure parent is rendered
    const timeoutId = setTimeout(updateHeight, 0);
    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);
  
  // Use external scroll progress if provided, otherwise use internal state
  const scrollProgress = externalScrollProgress !== undefined 
    ? externalScrollProgress * 2.5 // Scale 0-1 to 0-2.5 for animation
    : 0;
  
  const width = 2000; // Much wider for parallel coordinates and radial chart
  const height = containerHeight + 80; // Use 100% of container height
  const centerX = width / 2;
  const centerY = height / 2;

  // Sample products for visualization - up to 200 products total
  const SAMPLED_PRODUCTS = useMemo(() => {
    const gradeGroups: Record<string, any[]> = {};
    
    data.forEach(p => {
      if (!gradeGroups[p.grade]) gradeGroups[p.grade] = [];
      gradeGroups[p.grade].push(p);
    });
    
    const sampled: any[] = [];
    const MAX_TOTAL_PRODUCTS = 80; // Reduced to allow more spacing between products
    const grades = Object.keys(gradeGroups);
    
    // Calculate how many products per grade to get close to 80 total
    const productsPerGrade = Math.ceil(MAX_TOTAL_PRODUCTS / grades.length);
    
    Object.keys(gradeGroups).forEach(grade => {
      const group = gradeGroups[grade];
      
      if (group.length <= productsPerGrade) {
        // Use all products if under the per-grade limit
        sampled.push(...group);
      } else {
        // Sample up to productsPerGrade per grade
        const shuffled = [...group].sort(() => Math.random() - 0.5);
        sampled.push(...shuffled.slice(0, productsPerGrade));
      }
    });
    
    // If we still have more than 80, randomly sample down to 80
    if (sampled.length > MAX_TOTAL_PRODUCTS) {
      const shuffled = [...sampled].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, MAX_TOTAL_PRODUCTS);
    }
    
    return sampled;
  }, [data]);
  
  // Calculate actual data ranges for parallel coordinates normalization using ALL data, not just sampled
  const dataRanges = useMemo(() => {
    const ranges: Record<string, { min: number, max: number }> = {};
    const nutritionKeys = ['additives', 'energy', 'protein', 'sugar', 'fat', 'saturatedFat', 'carbohydrates', 'fiber', 'sodium'];
    
    // Use all data to calculate ranges, not just sampled products
    nutritionKeys.forEach(key => {
      const values: number[] = [];
      data.forEach(d => {
        let value = 0;
        if (key === 'protein') {
          value = d.protein || d.proteins || 0;
        } else if (key === 'sugar') {
          value = d.sugar || d.sugars || 0;
        } else if (key === 'saturatedFat') {
          value = d.saturatedFat || d.saturated_fat || 0;
        } else {
          value = d[key] || 0;
        }
        if (value > 0) values.push(value);
      });
      
      if (values.length > 0) {
        ranges[key] = {
          min: Math.min(...values),
          max: Math.max(...values)
        };
      } else {
        ranges[key] = { min: 0, max: 1 };
      }
    });
    
    return ranges;
  }, [data]);
  
  // State for hover - product info shown in sidebar
  const [hoveredProduct, setHoveredProduct] = useState<any>(null);

  const STORY_CONTENT = [
    {
        stage: 0,
        title: "Nutri-Score Cluster",
        icon: Layers,
        colorClass: "text-emerald-600",
        bgClass: "bg-emerald-100",
        borderClass: "border-emerald-500",
        description: <>The ecosystem of {data.length} products. <span className="text-emerald-600 font-bold">Grade A</span> aligns with whole foods, while <span className="text-red-500 font-bold">Grade E</span> clusters around processed foods.</>
    },
    {
        stage: 1,
        title: "Category Flows",
        icon: Activity,
        colorClass: "text-blue-600",
        bgClass: "bg-blue-100",
        borderClass: "border-blue-500",
        description: <>Unrolling the radial view into a <strong>Sankey Diagram</strong>. <br/><br/>The <strong>Categories</strong> (right axis) serve as our pivot point.</>
    },
    {
        stage: 2,
        title: "Corner Turn",
        icon: Zap,
        colorClass: "text-amber-600",
        bgClass: "bg-amber-100",
        borderClass: "border-amber-500",
        description: <>We slide and rotate 90 degrees. <br/><br/>The grades rotate away into the background, while the <strong>Parallel Coordinates</strong> swing out to face the viewer.</>
    }
  ];

  // Update stage based on scroll progress
  useEffect(() => {
    const newStage = Math.floor(scrollProgress);
    setActiveStage(newStage);
    
    // Mark as complete when we've scrolled through all stages
    if (scrollProgress >= 2.4 && !isComplete) {
      setIsComplete(true);
      if (onComplete) {
        setTimeout(() => onComplete(), 500);
      }
    }
  }, [scrollProgress, isComplete, onComplete]);

  // --- Layout Engine ---
  const layout = useMemo(() => {
    const grades = ['A', 'B', 'C', 'D', 'E'];
    const gradeNodes = grades.map(g => ({
      id: `grade-${g}`, type: 'grade', label: `Grade ${g}`, value: g, color: GRADE_COLORS[g as keyof typeof GRADE_COLORS],
      count: data.filter(d => d.grade === g).length
    }));
    // Create product nodes with shorter labels for display
    const productNodes = SAMPLED_PRODUCTS.map((product, index) => {
      // Use shortName from data if available, otherwise truncate
      const fullName = product.productName || `Product ${product.id}`;
      const shortName = product.shortName || (fullName.length > 20 
        ? fullName.substring(0, 17) + '...'
        : fullName);
      
      return {
        id: `product-${product.id}`,
        type: 'product',
        label: shortName, // Display short name
        fullName: fullName, // Full name for hover
        value: product.id,
        color: GRADE_COLORS[product.grade as keyof typeof GRADE_COLORS],
        grade: product.grade,
        category: product.category,
        additives: product.additives,
        energy: product.energy
      };
    });

    // 1. Radial - use 80% of the container
    const radial = { nodes: {} as Record<string, any> };
    // Use 80% of the smaller dimension to fill most of the container
    const maxRadius = Math.min(width, height) * 0.8; // Use 80% of the smaller dimension
    const gradeRadius = maxRadius * 0.25; // Grades closer to center
    const productRadius = maxRadius * 0.85; // Products near the edge but within bounds
    
    gradeNodes.forEach((n, i) => {
      const angle = (i / grades.length) * 360;
      radial.nodes[n.id] = { ...n, ...polarToCartesian(centerX, centerY, gradeRadius, angle), r: 40, opacity: 1 }; // Increased for larger radial
    });
    
    // Distribute product nodes in a circle that uses 80% of container
    productNodes.forEach((n, i) => {
      const angle = (i / productNodes.length) * 360;
      radial.nodes[n.id] = { ...n, ...polarToCartesian(centerX, centerY, productRadius, angle), r: 16, opacity: 1 }; // Increased for larger radial
    });

    // 2. Linear - use 100% of container with increased spacing between products
    // Minimize margins to maximize available height for better spacing
    const availableHeight = height+100; // Minimal margins (15px top, 15px bottom) to maximize spacing
    // Calculate spacing with minimum requirement for better readability
    const baseSpacing = availableHeight / (productNodes.length - 1 || 1);
    const minSpacing = 10; // Minimum 10px spacing between products
    const linearYGapProduct = Math.max(baseSpacing, minSpacing);
    
    const linearYGapGrade = (height - 40) / (grades.length - 1); // Adjusted for 100% container
    const linear = { nodes: {} as Record<string, any> };

    // Position products vertically - use 100% of container with better spacing
    productNodes.forEach((n, i) => {
      linear.nodes[n.id] = { ...n, lx: 0, ly: 15 + i * linearYGapProduct, lz: 0, r: 18 }; // Start at 15 (top margin)
    });
    gradeNodes.forEach((n, i) => {
      linear.nodes[n.id] = { ...n, lx: -width * 0.5, ly: 20 + i * linearYGapGrade, lz: 0, r: 30 }; // Adjusted for 100% container
    });

    return { gradeNodes, productNodes, radial, linear };
  }, [centerX, centerY, width, height, data, SAMPLED_PRODUCTS]);

  // --- Dynamic Positioning ---
  const getPivotX = () => {
    // Freeze animation if scrolling past stage 2
    const effectiveProgress = Math.min(scrollProgress, 2.5);
    
    // Adjust pivot to use more of the width - position axes to fill the space
    if (effectiveProgress <= 1) return width * 0.6; // Start position
    const t = Math.min(1, effectiveProgress - 1);
    return lerp(width * 0.6, width * 0.15, easeCubicInOut(t)); // Move to use left side of canvas
  };

  const getNodePos = (id: string) => {
    // Freeze animation if scrolling past charts
    const effectiveProgress = Math.min(scrollProgress, 2.5);

    let x, y, r, opacity, scale;
    const { radial, linear } = layout;
    const nodeType = id.startsWith('grade') ? 'grade' : 'product';
    const currentPivotX = getPivotX();

    if (effectiveProgress < 1) {
      const t = easeCubicInOut(effectiveProgress);
      const radNode = radial.nodes[id];
      const linNode = linear.nodes[id]; 
      const sankeyPos = project3D(linNode.lx, linNode.ly, linNode.lz, 0, width * 0.6, 0); // Use percentage of width

      x = lerp(radNode.x, sankeyPos.x, t);
      y = lerp(radNode.y, sankeyPos.y, t);
      r = lerp(radNode.r, linNode.r, t);
      opacity = 1;
      scale = 1;
    } else {
      const linNode = linear.nodes[id];
      const t = Math.min(1, effectiveProgress - 1);
      const angle = easeCubicInOut(t) * -90; 
      
      if (nodeType === 'grade') {
          const pos = project3D(linNode.lx, linNode.ly, linNode.lz, angle, currentPivotX, 0);
          x = pos.x; y = pos.y; scale = pos.scale; r = linNode.r * scale;
          opacity = 1 - easeCubicInOut(t);
      } else {
          const pos = project3D(0, linNode.ly, 0, angle, currentPivotX, 0);
          x = pos.x; y = pos.y; scale = pos.scale; r = linNode.r * scale;
          opacity = 1;
      }
    }
    return { x, y, r, opacity, scale };
  };

  const renderFlows = () => {
    const flows = [];
    const currentPivotX = getPivotX();
    const effectiveProgress = Math.min(scrollProgress, 2.5);
    
    // Use sampled products for flows
    SAMPLED_PRODUCTS.forEach((d) => {
      const gradeId = `grade-${d.grade}`;
      const productId = `product-${d.id}`;
      const gradePos = getNodePos(gradeId);
      const productPos = getNodePos(productId);
      
      // Skip if product node doesn't exist (not in sampled set)
      if (!productPos || productPos.opacity < 0.01) return;
      const t = effectiveProgress > 1 ? easeCubicInOut(Math.min(1, effectiveProgress - 1)) : 0;
      const sankeyOpacity = effectiveProgress > 1 ? (1 - t) : 1;
      const parallelOpacity = effectiveProgress > 1 ? t : 0;
      const isHovered = hoveredNode === gradeId || hoveredNode === productId;
      const baseOpacity = isHovered ? 0.9 : 0.15;
      const strokeWidth = isHovered ? 5 : 2.5; // Increased from 3/1.5 to 5/2.5 for better visibility

      if (sankeyOpacity > 0.01) {
        let path1 = "";
        if (effectiveProgress < 1) {
            const cp1x = (gradePos.x + productPos.x) / 2;
            path1 = `M ${gradePos.x} ${gradePos.y} C ${cp1x} ${gradePos.y}, ${cp1x} ${productPos.y}, ${productPos.x} ${productPos.y}`;
        } else {
            const midX = (gradePos.x + productPos.x) / 2;
            path1 = `M ${gradePos.x} ${gradePos.y} C ${midX} ${gradePos.y}, ${midX} ${productPos.y}, ${productPos.x} ${productPos.y}`;
        }
        flows.push(
            <path key={`sankey-${d.id}`} d={path1} fill="none" stroke={GRADE_COLORS[d.grade as keyof typeof GRADE_COLORS]} strokeWidth={strokeWidth} strokeOpacity={baseOpacity * sankeyOpacity}/>
        );
      }

      if (effectiveProgress > 0.1) {
          // Parallel coordinates with multiple nutritional attributes
          // Use more of the width - spread axes across the full canvas
          const axisSpacing = width * 0.08; // Space between axes as percentage of width
          const startLz = width * 0.1; // Start position
          const nutritionAttrs = [
            { key: 'additives', lz: startLz, label: 'Additives' },
            { key: 'energy', lz: startLz + axisSpacing, label: 'Energy (kcal)' },
            { key: 'protein', lz: startLz + axisSpacing * 2, label: 'Protein (g)' },
            { key: 'sugar', lz: startLz + axisSpacing * 3, label: 'Sugar (g)' },
            { key: 'fat', lz: startLz + axisSpacing * 4, label: 'Fat (g)' },
            { key: 'saturatedFat', lz: startLz + axisSpacing * 5, label: 'Sat. Fat (g)' },
            { key: 'carbohydrates', lz: startLz + axisSpacing * 6, label: 'Carbs (g)' },
            { key: 'fiber', lz: startLz + axisSpacing * 7, label: 'Fiber (g)' },
            { key: 'sodium', lz: startLz + axisSpacing * 8, label: 'Sodium (g)' }
          ];
          
          const angle = effectiveProgress > 1 ? t * -90 : 0;
          const points: any[] = [];
          
          // Start from product node
          points.push({ x: productPos.x, y: productPos.y });
          
          // Define visible bounds for parallel coordinates - use more of the height (smaller margins)
          const topMargin = height * 0.05; // 5% margin at top
          const bottomMargin = height * 0.05; // 5% margin at bottom
          const visibleHeight = height - topMargin - bottomMargin;
          
          // Add points for each nutritional attribute
          nutritionAttrs.forEach(attr => {
            // Map field names: handle both camelCase and snake_case
            let value = 0;
            if (attr.key === 'protein') {
              value = d.protein || d.proteins || 0;
            } else if (attr.key === 'sugar') {
              value = d.sugar || d.sugars || 0;
            } else if (attr.key === 'saturatedFat') {
              value = d.saturatedFat || d.saturated_fat || 0;
            } else {
              value = d[attr.key] || 0;
            }
            
            // Use actual data range for normalization to prevent over-extension
            const range = dataRanges[attr.key];
            if (range && range.max > range.min) {
              // Normalize to 0-1 based on actual data range, with minimal padding
              const padding = (range.max - range.min) * 0.05; // 5% padding
              const normalized = Math.max(0, Math.min(1, (value - range.min + padding) / (range.max - range.min + 2 * padding)));
              // Map to visible area: topMargin to height - bottomMargin
              const ly = topMargin + (1 - normalized) * visibleHeight;
              const projected = project3D(0, ly, attr.lz, angle, currentPivotX, 0);
              points.push(projected);
            } else {
              // Fallback if no data range - center in visible area
              const ly = topMargin + visibleHeight / 2;
              const projected = project3D(0, ly, attr.lz, angle, currentPivotX, 0);
              points.push(projected);
            }
          });
          
          if (parallelOpacity > 0.01) {
            // Draw polyline through all points
            const pathData = points.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`).join(' ');
            const isParallelHovered = hoveredNode === `parallel-${d.id}`;
            flows.push(
              <path 
                key={`parallel-${d.id}`} 
                d={pathData} 
                fill="none" 
                stroke={GRADE_COLORS[d.grade as keyof typeof GRADE_COLORS]} 
                strokeWidth={isParallelHovered ? 4 : strokeWidth} 
                strokeOpacity={isParallelHovered ? 1 : baseOpacity * parallelOpacity}
                onMouseEnter={() => {
                  setHoveredNode(`parallel-${d.id}`);
                  setHoveredProduct(d);
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  setHoveredProduct(null);
                }}
                style={{ cursor: 'pointer' }}
              />
            );
          }
      }
    });
    return flows;
  };

  const renderAxes = () => {
    const effectiveProgress = Math.min(scrollProgress, 2.5);
    if (effectiveProgress <= 1.05) return null;
    const t = easeCubicInOut(Math.min(1, effectiveProgress - 1));
    const angle = t * -90;
    const currentPivotX = getPivotX();
    
    // Use percentage-based spacing to fill the width
    const axisSpacing = width * 0.08;
    const startLz = width * 0.1;
    const nutritionAttrs = [
      { key: 'additives', lz: startLz, label: 'Additives' },
      { key: 'energy', lz: startLz + axisSpacing, label: 'Energy (kcal)' },
      { key: 'protein', lz: startLz + axisSpacing * 2, label: 'Protein (g)' },
      { key: 'sugar', lz: startLz + axisSpacing * 3, label: 'Sugar (g)' },
      { key: 'fat', lz: startLz + axisSpacing * 4, label: 'Fat (g)' },
      { key: 'saturatedFat', lz: startLz + axisSpacing * 5, label: 'Sat. Fat (g)' },
      { key: 'carbohydrates', lz: startLz + axisSpacing * 6, label: 'Carbs (g)' },
      { key: 'fiber', lz: startLz + axisSpacing * 7, label: 'Fiber (g)' },
      { key: 'sodium', lz: startLz + axisSpacing * 8, label: 'Sodium (g)' }
    ];
    
    // Define visible bounds - use more of the height (5% margins to fill more space)
    const topMargin = height * 0.05;
    const bottomMargin = height * 0.05;
    
    const axes: JSX.Element[] = [];
    const style = { stroke: '#94a3b8', strokeWidth: 2.5, strokeDasharray: '4 4' }; // Increased from 1 to 2.5
    const labelStyle = { fontSize: '18px', fill: '#64748b', fontWeight: '600' }; // Increased from 13px to 18px
    
    nutritionAttrs.forEach(attr => {
      const top = project3D(0, topMargin, attr.lz, angle, currentPivotX, 0);
      const bot = project3D(0, height - bottomMargin, attr.lz, angle, currentPivotX, 0);
      
      axes.push(
        <line key={`axis-${attr.key}`} x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} {...style} />
      );
      
      // Add label at top of axis
      axes.push(
        <text 
          key={`label-${attr.key}`} 
          x={top.x} 
          y={top.y - 15} 
          textAnchor="middle" 
          style={labelStyle}
        >
          {attr.label}
        </text>
      );
    });

    return (
      <g opacity={t}>
        {axes}
      </g>
    );
  };

  // Determine Story Card Content based on Scroll
  const currentStory = STORY_CONTENT[Math.min(activeStage, 2)];
  const Icon = currentStory.icon;

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        fontFamily: 'sans-serif',
        color: '#1e293b',
        position: 'relative',
        backgroundColor: '#f8fafc'
      }}
    >
      {/* VISUALIZATION LAYER */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          padding: '0',
          pointerEvents: 'auto'
        }}
      >
         <div style={{
           width: '100%',
           height: '100%',
           display: 'flex',
           flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
           gap: window.innerWidth < 1024 ? '12px' : '24px',
           pointerEvents: 'auto',
           alignItems: 'stretch'
         }}>
            {/* Chart Area */}
            <div style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              position: 'relative',
              minHeight: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  zIndex: 10
                }}>
                    <h2 style={{
                      fontSize: window.innerWidth < 768 ? '16px' : window.innerWidth < 1024 ? '18px' : '20px',
                      fontWeight: 'bold',
                      background: 'linear-gradient(to right, #059669, #14b8a6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>Food Quality ecosystem</h2>
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      marginTop: '4px',
                      flexWrap: 'wrap'
                    }}>
                        {Object.entries(GRADE_COLORS).map(([grade, color]) => (
                            <div key={grade} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: color
                                }}></span>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: '#64748b'
                                }}>{grade}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <svg 
                  viewBox={`0 0 ${width} ${height}`} 
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    flex: 1,
                    minHeight: 0,
                    display: 'block'
                  }} 
                  preserveAspectRatio="xMidYMid meet"
                >
                    {renderAxes()}
                    {renderFlows()}
                    {[...layout.gradeNodes, ...layout.productNodes].map(node => {
                        const pos = getNodePos(node.id);
                        if (pos.opacity < 0.05) return null;
                        const isProduct = node.id.startsWith('product-');
                        const isGrade = node.id.startsWith('grade-');
                        
                        const isHovered = hoveredNode === node.id;
                        const hoverRadius = isHovered ? pos.r * 1.4 : pos.r;
                        const hoverStrokeWidth = isHovered ? (isProduct ? "4" : "5") : (isProduct ? "2" : "3");
                        const hoverOpacity = isHovered ? 1 : 0.9;
                        
                        return (
                            <g 
                                key={node.id} 
                                transform={`translate(${pos.x},${pos.y})`} 
                                onMouseEnter={(e) => {
                                    setHoveredNode(node.id);
                                    if (isProduct) {
                                        const product = SAMPLED_PRODUCTS.find(p => `product-${p.id}` === node.id);
                                        if (product) {
                                            setHoveredProduct(product);
                                        }
                                    }
                                }} 
                                onMouseLeave={() => {
                                    setHoveredNode(null);
                                    setHoveredProduct(null);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <circle r={hoverRadius} fill={node.color} stroke="#fff" strokeWidth={hoverStrokeWidth} fillOpacity={hoverOpacity} />
                                {isGrade && (
                                    <text dy={4} textAnchor="middle" style={{ fontSize: '20px', fontWeight: 'bold', fill: '#ffffff', pointerEvents: 'none' }}>{node.count}</text>
                                )}
                                {isProduct && pos.opacity > 0.5 && (() => {
                                    // Determine if we're in Sankey or parallel coordinates phase (not radial)
                                    const effectiveProgress = Math.min(scrollProgress, 2.5);
                                    const isSankeyOrParallel = effectiveProgress >= 0.3; // After radial phase starts transitioning to Sankey
                                    // Move text up more for Sankey and parallel coordinates (reduce offset from 20 to 8)
                                    const textOffset = isSankeyOrParallel ? (pos.r || 18) + 8 : (pos.r || 18) + 20;
                                    
                                    return (
                                        <text 
                                            dy={textOffset} 
                                            textAnchor="middle" 
                                            style={{ 
                                                fontSize: '14px', 
                                                fill: '#475569',
                                                fontWeight: '600',
                                                opacity: Math.max(pos.opacity, 0.9),
                                                letterSpacing: '0.02em',
                                                textShadow: '0 1px 2px rgba(255,255,255,0.9)'
                                            }}
                                        >
                                            {node.label}
                                        </text>
                                    );
                                })()}
                                {isGrade && (
                                    <text dy={pos.r + 18} textAnchor="middle" style={{ fontSize: '18px', fontWeight: 'bold', fill: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: pos.opacity }}>{node.label}</text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
            
            
            {/* Side Panel (Story) */}
            <div style={{
              width: window.innerWidth < 768 ? '100%' : window.innerWidth < 1024 ? '256px' : window.innerWidth < 1280 ? '320px' : '384px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                 <div style={{
                   width: '100%',
                   padding: window.innerWidth < 768 ? '12px' : window.innerWidth < 1024 ? '16px' : '24px',
                   borderRadius: '8px',
                   boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                   borderLeft: '4px solid',
                   borderLeftColor: currentStory.stage === 0 ? '#10b981' : currentStory.stage === 1 ? '#0ea5e9' : '#f59e0b',
                   transition: 'all 0.5s',
                   backgroundColor: 'rgba(255, 255, 255, 0.95)',
                   backdropFilter: 'blur(4px)'
                 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                        <div style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: currentStory.stage === 0 ? 'rgba(16, 185, 129, 0.1)' : currentStory.stage === 1 ? 'rgba(14, 165, 233, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: currentStory.stage === 0 ? '#10b981' : currentStory.stage === 1 ? '#0ea5e9' : '#f59e0b'
                        }}>
                            <Icon size={18} />
                        </div>
                        <h3 style={{
                          fontSize: window.innerWidth < 768 ? '14px' : window.innerWidth < 1024 ? '16px' : '20px',
                          fontWeight: 'bold'
                        }}>{currentStory.title}</h3>
                    </div>
                    <p style={{
                      color: '#475569',
                      fontSize: window.innerWidth < 768 ? '11px' : window.innerWidth < 1024 ? '12px' : '14px',
                      lineHeight: '1.6',
                      marginBottom: '16px'
                    }}>{currentStory.description}</p>
                    
                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      color: '#94a3b8'
                    }}>
                        <span style={{
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                            Stage {Math.min(activeStage + 1, 3)} / 3
                        </span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                             <span>Scroll</span> <ChevronDown size={10} />
                        </div>
                    </div>
                </div>
                
                {/* Product Information - shown when hovering over parallel coordinates */}
                {hoveredProduct && (
                    <div style={{
                        width: '100%',
                        marginTop: '16px',
                        padding: window.innerWidth < 768 ? '12px' : window.innerWidth < 1024 ? '16px' : '24px',
                        borderRadius: '8px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        borderLeft: '4px solid',
                        borderLeftColor: GRADE_COLORS[hoveredProduct.grade as keyof typeof GRADE_COLORS] || '#64748b',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            fontWeight: 'bold',
                            marginBottom: '12px',
                            fontSize: window.innerWidth < 768 ? '14px' : window.innerWidth < 1024 ? '16px' : '18px',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '8px',
                            color: '#1e293b'
                        }}>
                            {hoveredProduct.productName || `Product ${hoveredProduct.id}`}
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            fontSize: window.innerWidth < 768 ? '11px' : window.innerWidth < 1024 ? '12px' : '13px',
                            color: '#475569'
                        }}>
                            <div><strong>Grade:</strong> {hoveredProduct.grade?.toUpperCase()}</div>
                            <div><strong>Category:</strong> {hoveredProduct.category}</div>
                            {hoveredProduct.energy !== undefined && hoveredProduct.energy !== null && <div><strong>Energy:</strong> {hoveredProduct.energy} kcal</div>}
                            {(hoveredProduct.protein !== undefined || hoveredProduct.proteins !== undefined) && <div><strong>Protein:</strong> {(hoveredProduct.protein || hoveredProduct.proteins || 0).toFixed(1)}g</div>}
                            {(hoveredProduct.sugar !== undefined || hoveredProduct.sugars !== undefined) && <div><strong>Sugar:</strong> {(hoveredProduct.sugar || hoveredProduct.sugars || 0).toFixed(1)}g</div>}
                            {hoveredProduct.fat !== undefined && hoveredProduct.fat !== null && <div><strong>Fat:</strong> {hoveredProduct.fat.toFixed(1)}g</div>}
                            {(hoveredProduct.saturatedFat !== undefined || hoveredProduct.saturated_fat !== undefined) && <div><strong>Sat. Fat:</strong> {(hoveredProduct.saturatedFat || hoveredProduct.saturated_fat || 0).toFixed(1)}g</div>}
                            {hoveredProduct.carbohydrates !== undefined && hoveredProduct.carbohydrates !== null && <div><strong>Carbs:</strong> {hoveredProduct.carbohydrates.toFixed(1)}g</div>}
                            {hoveredProduct.fiber !== undefined && hoveredProduct.fiber !== null && <div><strong>Fiber:</strong> {hoveredProduct.fiber.toFixed(1)}g</div>}
                            {hoveredProduct.sodium !== undefined && hoveredProduct.sodium !== null && <div><strong>Sodium:</strong> {hoveredProduct.sodium.toFixed(2)}g</div>}
                            {hoveredProduct.additives !== undefined && hoveredProduct.additives !== null && <div><strong>Additives:</strong> {hoveredProduct.additives}</div>}
                        </div>
                    </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Visualization1;
