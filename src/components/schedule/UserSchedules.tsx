
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    }
    
    // Load schedules from localStorage
    const storedSchedules = localStorage.getItem('userSchedules');
    if (storedSchedules) {
      try {
        const parsedSchedules = JSON.parse(storedSchedules);
        // Process dates to be Date objects
        const processedSchedules = parsedSchedules.map((schedule: any) => ({
          ...schedule,
          dates: schedule.dates.map((dateInfo: any) => ({
            ...dateInfo,
            date: new Date(dateInfo.date)
          }))
        }));
        setSchedules(processedSchedules);
      } catch (error) {
        console.error('Erro ao processar escalas:', error);
        setSchedules([]);
      }
    } else {
      setSchedules([]);
    }
    setIsLoading(false);
  }, []);

  const toggleUserSelection = (email: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };

  const exportSelectedToCSV = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Nenhum utilizador selecionado",
        description: "Por favor, selecione pelo menos um utilizador para exportar.",
        variant: "destructive",
      });
      return;
    }

    const filteredSchedules = schedules.filter(schedule => 
      selectedUsers.includes(schedule.email)
    );

    // Create and download CSV file with better formatting
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(16);
    doc.text("Escalas Cruz Vermelha Amares", 14, 20);
    doc.setFontSize(12);
    doc.text(`Data de exportação: ${format(new Date(), "dd/MM/yyyy")}`, 14, 28);
    
    let yPos = 40;
    
    // Process each user separately
    filteredSchedules.forEach((schedule, userIndex) => {
      // Add user header
      if (userIndex > 0) {
        // Add page break if not the first user
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(`Escala de: ${schedule.user} (${schedule.email})`, 14, yPos);
      doc.text(`Mês: ${schedule.month}`, 14, yPos + 8);
      
      yPos += 20;
      
      // Group by date for better organization
      const tableData = schedule.dates.map((dateInfo: any) => {
        return [
          format(new Date(dateInfo.date), "d 'de' MMMM", { locale: pt }),
          dateInfo.shifts.map((shift: string) => 
            shift === "manha" ? "Manhã" : 
            shift === "tarde" ? "Tarde" : "Noite"
          ).join(", ")
        ];
      });
      
      // Sort by date
      tableData.sort((a: any, b: any) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Turnos']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [110, 89, 165], textColor: 255 },
        margin: { top: 30 },
      });
    });
    
    // Save the PDF
    doc.save(`escalas_utilizadores_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "Exportação concluída",
      description: `Exportados dados de ${selectedUsers.length} utilizadores em formato PDF.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {userInfo && userInfo.role === 'admin' && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={exportSelectedToCSV}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              disabled={selectedUsers.length === 0}
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
            <span className="text-sm text-gray-600">
              {selectedUsers.length} utilizador(es) selecionado(s)
            </span>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Escalas dos Utilizadores</CardTitle>
          <CardDescription>Visualize todas as escalas submetidas pelos utilizadores</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-pulse text-gray-500">A carregar escalas...</div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-gray-500">Não existem escalas submetidas.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {userInfo && userInfo.role === 'admin' && (
                    <TableHead className="w-[50px]"></TableHead>
                  )}
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Turnos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.flatMap((schedule) => 
                  schedule.dates.map((dateInfo: any, dateIndex: number) => (
                    <TableRow key={`${schedule.email}-${dateIndex}`}>
                      {dateIndex === 0 && userInfo && userInfo.role === 'admin' && (
                        <TableCell rowSpan={schedule.dates.length} className="align-middle">
                          <Checkbox 
                            checked={selectedUsers.includes(schedule.email)}
                            onCheckedChange={() => toggleUserSelection(schedule.email)}
                            className="ml-1"
                          />
                        </TableCell>
                      )}
                      {dateIndex === 0 ? (
                        <>
                          <TableCell rowSpan={schedule.dates.length} className="font-medium">{schedule.user}</TableCell>
                          <TableCell rowSpan={schedule.dates.length}>{schedule.email}</TableCell>
                          <TableCell rowSpan={schedule.dates.length}>{schedule.month}</TableCell>
                        </>
                      ) : null}
                      <TableCell>{format(new Date(dateInfo.date), "d 'de' MMMM", { locale: pt })}</TableCell>
                      <TableCell>
                        {dateInfo.shifts.map((shift: string) => (
                          <span key={shift} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            {shift === "manha" ? "Manhã" : shift === "tarde" ? "Tarde" : "Noite"}
                          </span>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSchedules;
