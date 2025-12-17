
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const exportSchedulesToPDF = async (
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
    selectedUsers.includes(schedule.user_email || schedule.email)
  );
  
  console.log('Filtered schedules for PDF:', filteredSchedules);
  console.log('Selected users:', selectedUsers);

  try {
    // Create PDF document with one user per page
    const doc = new jsPDF();
    
    // Add Cruz Vermelha logo/header helper function (synchronous to avoid complications)
    const addHeader = (doc: jsPDF, pageNumber: number, totalPages: number) => {
      try {
        // Clean white background for header
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 50, 'F');
        
        // Use Cruz Vermelha cross as logo (simple and reliable)
        doc.setFillColor(220, 53, 69);
        doc.roundedRect(15, 10, 30, 15, 2, 2, 'F');
        
        // Draw Cruz Vermelha cross
        doc.setFillColor(255, 255, 255);
        doc.rect(27, 12, 3, 11, 'F'); // Vertical bar
        doc.rect(20, 16, 17, 3, 'F'); // Horizontal bar
        
        // Main title
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Cruz Vermelha de Amares', 50, 18);
        
        // Subtitle
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Sistema de Gestão de Disponibilidades', 50, 25);
        
        // Page numbers if multiple pages
        if (totalPages > 1) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Página ${pageNumber} de ${totalPages}`, 190, 15, { align: 'right' });
        }
        
        // Separator line
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.line(15, 35, 195, 35);
        
      } catch (error) {
        console.error('Error adding header:', error);
        // Simple fallback header
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Cruz Vermelha de Amares', 105, 20, { align: 'center' });
      }
    };
    
    // Process each user
    for (let userIndex = 0; userIndex < filteredSchedules.length; userIndex++) {
      const schedule = filteredSchedules[userIndex];
      
      // Add a new page for each user after the first one
      if (userIndex > 0) {
        doc.addPage();
      }
      
      // Add header with page numbers
      addHeader(doc, userIndex + 1, filteredSchedules.length);
      
      // Title section
      const currentDate = new Date();
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
      const monthName = targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Escala de Serviço - ${monthName}`, 105, 45, { align: 'center' });
      
      // User info section with modern styling - adjusted height for submission date
      const boxHeight = (schedule.createdAt || schedule.created_at) ? 30 : 25;
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(15, 55, 180, boxHeight, 3, 3, 'F');
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, 55, 180, boxHeight, 3, 3, 'S');
      
      doc.setTextColor(220, 53, 69);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DO COLABORADOR', 20, 63);
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nome: ${schedule.user_name || schedule.user}`, 20, 70);
      doc.text(`Email: ${schedule.user_email || schedule.email}`, 20, 75);
      
      // Submission date if available
      if (schedule.createdAt || schedule.created_at) {
        const submitDate = new Date(schedule.createdAt || schedule.created_at);
        const dateStr = submitDate.toLocaleDateString('pt-PT');
        const timeStr = submitDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Submetido em: ${dateStr} às ${timeStr}`, 20, 80);
      }
      
      // Date and export info
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Documento gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 195, 75, { align: 'right' });
      
      // Handle both old format (array of date objects) and new format (object with shifts/overnights)
      const scheduleData = schedule.dates;
      let tableData: any[] = [];
      let totalItems = 0;
      
      // Check if dates is an object with shifts/overnights (new format)
      if (scheduleData && typeof scheduleData === 'object' && !Array.isArray(scheduleData)) {
        const shifts = scheduleData.shifts || [];
        const overnights = scheduleData.overnights || [];
        const shiftNotes = scheduleData.shiftNotes || '';
        const overnightNotes = scheduleData.overnightNotes || '';
        
        // Add shifts to table
        if (shifts.length > 0) {
          shifts.forEach((shift: string) => {
            tableData.push([
              shift,
              'Turno',
              shiftNotes
            ]);
          });
        }
        
        // Add overnights to table
        if (overnights.length > 0) {
          overnights.forEach((overnight: string) => {
            tableData.push([
              overnight,
              'Pernoita',
              overnightNotes
            ]);
          });
        }
        
        totalItems = shifts.length + overnights.length;
      } else if (Array.isArray(scheduleData)) {
        // Old format - array of date objects
        const sortedDates = [...scheduleData].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        tableData = sortedDates.map((dateInfo: any) => {
          const dateObj = new Date(dateInfo.date);
          const dayOfWeek = dateObj.toLocaleDateString('pt-PT', { weekday: 'long' });
          const formattedDate = format(dateObj, "d 'de' MMMM", { locale: pt });
          const fullDate = `${dayOfWeek}, ${formattedDate}`;
          
          const shifts = dateInfo.shifts.map((shift: string) => 
            shift === "manha" ? "Manhã" : 
            shift === "tarde" ? "Tarde" : 
            shift === "noite" ? "Noite" : shift
          ).join(", ");
          
          return [
            fullDate,
            shifts || "Sem turnos",
            dateInfo.notes || ""
          ];
        });
        
        totalItems = sortedDates.length;
      }
      
      // Check if there are any schedules
      if (tableData.length === 0) {
        // No schedules message
        doc.setFillColor(255, 249, 196);
        doc.roundedRect(15, 90, 180, 20, 3, 3, 'F');
        doc.setTextColor(133, 77, 14);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhum turno agendado para este período', 105, 102, { align: 'center' });
        continue;
      }
      
      // Determine table headers based on format
      const isNewFormat = scheduleData && typeof scheduleData === 'object' && !Array.isArray(scheduleData);
      const headers = isNewFormat 
        ? [['Dia/Turno', 'Tipo', 'Observações']]
        : [['Data', 'Turnos Atribuídos', 'Observações']];
      
      // Generate schedule table with improved styling
      autoTable(doc, {
        startY: 90,
        head: headers,
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [220, 53, 69],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { 
            cellWidth: 70,
            halign: 'left',
            fontStyle: 'bold'
          },
          1: { 
            cellWidth: 50,
            halign: 'center'
          },
          2: { 
            cellWidth: 60,
            halign: 'left'
          }
        },
        margin: { left: 15, right: 15 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1
      });
      
      // Add summary info
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      if (finalY < 250) {
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(15, finalY + 10, 180, 25, 3, 3, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(15, finalY + 10, 180, 25, 3, 3, 'S');
        
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO DO MÊS', 20, finalY + 18);
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total de entradas: ${totalItems}`, 20, finalY + 25);
      }
      
      // Add footer
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.3);
      doc.line(15, 285, 195, 285);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      const footerText = 'Cruz Vermelha de Amares - Documento oficial do sistema de gestão de disponibilidades';
      doc.text(footerText, 105, 290, { align: 'center' });
    }
    
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
