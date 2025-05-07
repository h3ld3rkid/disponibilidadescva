
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const exportSchedulesToPDF = (
  selectedUsers: string[],
  schedules: any[],
  toast: any
) => {
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

  try {
    // Create PDF document with one user per page
    const doc = new jsPDF();
    
    // Loop through each selected user
    filteredSchedules.forEach((schedule, userIndex) => {
      // Add a new page for each user after the first one
      if (userIndex > 0) {
        doc.addPage();
      }
      
      // Add title and header
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 102);
      doc.text("Escalas Cruz Vermelha Amares", 14, 20);
      
      // Add user info
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Utilizador: ${schedule.user}`, 14, 35);
      // Changed to display username instead of email in PDF export
      doc.text(`Nome de utilizador: ${schedule.user}`, 14, 45);
      doc.text(`Mês: ${schedule.month}`, 14, 55);
      
      // Date and export info
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data de exportação: ${format(new Date(), "dd/MM/yyyy")}`, 14, 65);
      
      // Sort dates chronologically
      const sortedDates = [...schedule.dates].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Prepare table data
      const tableData = sortedDates.map((dateInfo: any) => [
        format(new Date(dateInfo.date), "d 'de' MMMM", { locale: pt }),
        dateInfo.shifts.map((shift: string) => 
          shift === "manha" ? "Manhã" : 
          shift === "tarde" ? "Tarde" : "Noite"
        ).join(", "),
        dateInfo.notes || ""
      ]);
      
      // Generate schedule table
      autoTable(doc, {
        startY: 75,
        head: [['Data', 'Turnos', 'Notas Pessoais']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [110, 89, 165],
          textColor: 255 
        },
        styles: {
          cellPadding: 5,
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 50 },
          2: { cellWidth: 80 }
        }
      });
    });
    
    // Save the PDF
    doc.save(`escalas_utilizadores_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "Exportação concluída",
      description: `Exportados dados de ${selectedUsers.length} utilizador(es) em formato PDF.`,
    });
  } catch (error) {
    console.error("Erro ao exportar para PDF:", error);
    toast({
      title: "Erro na exportação",
      description: "Ocorreu um erro ao exportar as escalas",
      variant: "destructive",
    });
  }
};
