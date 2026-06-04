// Module declaration for Recharts when used with Preact's JSX runtime.
// Recharts ships React class components whose types are incompatible with
// Preact's ComponentClass. We re-declare the module with loose component
// types so consumers can use Recharts in Preact JSX without type errors.

declare module "recharts" {
  import type { ComponentType } from "preact";
  type AnyComp = ComponentType<Record<string, unknown>>;

  export const PieChart: AnyComp;
  export const Pie: AnyComp;
  export const Cell: AnyComp;
  export const Tooltip: AnyComp;
  export const ResponsiveContainer: AnyComp;
  export const Legend: AnyComp;
  export const LineChart: AnyComp;
  export const Line: AnyComp;
  export const XAxis: AnyComp;
  export const YAxis: AnyComp;
  export const CartesianGrid: AnyComp;
  export const Area: AnyComp;
  export const ComposedChart: AnyComp;
  export const BarChart: AnyComp;
  export const Bar: AnyComp;
  export const RadialBarChart: AnyComp;
  export const RadialBar: AnyComp;
  export const Scatter: AnyComp;
  export const ScatterChart: AnyComp;
  export const ReferenceLine: AnyComp;
  export const ReferenceArea: AnyComp;
  export const ReferenceDot: AnyComp;
  export const Brush: AnyComp;
  export const FunnelChart: AnyComp;
  export const Funnel: AnyComp;
  export const Treemap: AnyComp;
  export const Sankey: AnyComp;
  export const SunburstChart: AnyComp;
  export const RadarChart: AnyComp;
  export const Radar: AnyComp;
  export const PolarAngleAxis: AnyComp;
  export const PolarGrid: AnyComp;
  export const PolarRadiusAxis: AnyComp;
  export const ZAxis: AnyComp;
  export const ErrorBar: AnyComp;
  export const LabelList: AnyComp;
  export const Label: AnyComp;
  export const Customized: AnyComp;
  export const Text: AnyComp;
  export const Sector: AnyComp;
}
