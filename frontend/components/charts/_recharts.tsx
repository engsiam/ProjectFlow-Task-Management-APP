// Recharts is a React library. Preact's JSX runtime rejects its class
// component types. We re-export each component as a loosely-typed Preact
// ComponentType so JSX usage in Preact files typechecks cleanly.

import * as Recharts from "recharts";
import type { ComponentType } from "preact";

type AnyComp = ComponentType<Record<string, unknown>>;

export const PieChart = Recharts.PieChart as unknown as AnyComp;
export const Pie = Recharts.Pie as unknown as AnyComp;
export const Cell = Recharts.Cell as unknown as AnyComp;
export const Tooltip = Recharts.Tooltip as unknown as AnyComp;
export const ResponsiveContainer = Recharts.ResponsiveContainer as unknown as AnyComp;
export const Legend = Recharts.Legend as unknown as AnyComp;
export const LineChart = Recharts.LineChart as unknown as AnyComp;
export const Line = Recharts.Line as unknown as AnyComp;
export const XAxis = Recharts.XAxis as unknown as AnyComp;
export const YAxis = Recharts.YAxis as unknown as AnyComp;
export const CartesianGrid = Recharts.CartesianGrid as unknown as AnyComp;
export const Area = Recharts.Area as unknown as AnyComp;
export const ComposedChart = Recharts.ComposedChart as unknown as AnyComp;
export const BarChart = Recharts.BarChart as unknown as AnyComp;
export const Bar = Recharts.Bar as unknown as AnyComp;
