"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MonthlyChart({ data }: { data: { month: string; charges: number; cleared: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Monthly Charges vs Cleared</CardTitle></CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="charges" fill="hsl(262 83% 58%)" name="Charges" />
            <Bar dataKey="cleared" fill="hsl(160 70% 45%)" name="Cleared" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
