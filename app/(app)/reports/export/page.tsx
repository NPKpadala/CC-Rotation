import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExportCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Download className="h-6 w-6 text-primary-600" /> Export Center
        </h1>
        <p className="text-sm text-slate-500">Download reports for accounting and audit.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Pending Customers — Excel
            </CardTitle>
            <CardDescription>3-sheet workbook: Summary, Pending Customers, Payment-wise breakdown.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/api/export/excel?type=pending" download>
                <Download className="h-4 w-4" /> Download .xlsx
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" /> Pending Customers — PDF
            </CardTitle>
            <CardDescription>Print-ready landscape PDF with company header and footer disclaimer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/api/export/pdf?type=pending" download>
                <Download className="h-4 w-4" /> Download .pdf
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
