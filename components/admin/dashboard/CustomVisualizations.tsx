"use client";

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, TreeMap, Sankey, SankeyLink,
  SankeyNode, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Treemap
} from "recharts";

export function CustomTreemap({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <Treemap
          data={data}
          dataKey="value"
          ratio={4/3}
          stroke="#fff"
          fill="#8884d8"
          content={<CustomizedContent />}
        />
      </ResponsiveContainer>
    </Card>
  );
}

export function CustomSankey({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <Sankey
          data={data}
          node={<CustomizedNode />}
          link={<CustomizedLink />}
          nodePadding={50}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        />
      </ResponsiveContainer>
    </Card>
  );
}

export function CustomRadar({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis />
          <Radar
            name="Métricas"
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Componentes personalizados para las visualizaciones
const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : 'none',
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 7}
          textAnchor="middle"
          fill="#fff"
          fontSize={14}
        >
          {name}
        </text>
      ) : null}
    </g>
  );
};

const CustomizedNode = ({ payload, x, y }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={payload.value / 50} fill="#8884d8" />
      <text x={0} y={0} textAnchor="middle" fill="#fff">
        {payload.name}
      </text>
    </g>
  );
};

const CustomizedLink = ({ sourceX, sourceY, targetX, targetY, payload }: any) => {
  return (
    <path
      d={`M${sourceX},${sourceY}L${targetX},${targetY}`}
      fill="none"
      stroke="#8884d8"
      strokeWidth={payload.value / 10}
    />
  );
};