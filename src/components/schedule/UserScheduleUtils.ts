
import { format } from "date-fns";
import { jsPDF } from "jspdf";

// Weekday order for sorting
const weekdayOrder = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

const sortByWeekday = (items: string[]): string[] => {
  return items.sort((a, b) => {
    const indexA = weekdayOrder.indexOf(a);
    const indexB = weekdayOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });
};

const getScheduleMonth = (): string => {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
};

const addHeader = async (doc: jsPDF, pageNumber: number, totalPages: number) => {
  try {
    // Clean white background for header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Load and add logo
    try {
      const logoUrl = '/lovable-uploads/a1f20fae-1bb5-44e2-ab03-37a1183b39d8.png';
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      const logoBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      doc.addImage(logoBase64, 'PNG', 20, 15, 40, 20);
    } catch (error) {
      console.warn('Could not load logo, using fallback:', error);
      // Fallback - Cruz Vermelha cross
      doc.setFillColor(220, 53, 69);
      doc.roundedRect(20, 15, 40, 20, 2, 2, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(35, 18, 4, 14, 'F');
      doc.rect(25, 23, 24, 4, 'F');
    }
    
    // Main title
    doc.setTextColor(220, 53, 69);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Cruz Vermelha de Amares', 70, 22);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Gestão de Disponibilidades', 70, 30);
    
    // Page numbers if multiple pages
    if (totalPages > 1) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${pageNumber} de ${totalPages}`, 190, 15, { align: 'right' });
    }
    
    // Separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
  } catch (error) {
    console.error('Error adding header:', error);
    doc.setTextColor(220, 53, 69);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Cruz Vermelha de Amares', 105, 25, { align: 'center' });
  }
};

const addTitle = (doc: jsPDF) => {
  const monthName = getScheduleMonth();
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Escala de Serviço - ${monthName}`, 105, 60, { align: 'center' });
};

const addUserInfo = (doc: jsPDF, schedule: any) => {
  const hasCreatedAt = schedule.createdAt || schedule.created_at;
  const boxHeight = hasCreatedAt ? 38 : 30;
  
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(20, 70, 170, boxHeight, 5, 5, 'F');
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(1);
  doc.roundedRect(20, 70, 170, boxHeight, 5, 5, 'S');
  
  doc.setTextColor(220, 53, 69);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('COLABORADOR', 25, 80);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${schedule.user_name || schedule.user}`, 25, 87);
  doc.text(`Email: ${schedule.user_email || schedule.email}`, 25, 94);
  
  if (hasCreatedAt) {
    const submitDate = new Date(schedule.createdAt || schedule.created_at);
    const dateStr = submitDate.toLocaleDateString('pt-PT');
    const timeStr = submitDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Submetido em: ${dateStr} às ${timeStr}`, 25, 101);
  }
};

const addShifts = (doc: jsPDF, scheduleData: any): number => {
  let yPosition = 115;
  
  if (!scheduleData || typeof scheduleData !== 'object') {
    addNoShiftsMessage(doc, yPosition);
    return yPosition + 25;
  }

  const shifts = scheduleData.shifts || [];
  const overnights = scheduleData.overnights || [];
  const shiftNotes = scheduleData.shiftNotes || scheduleData.shift_notes || '';
  const overnightNotes = scheduleData.overnightNotes || scheduleData.overnight_notes || '';
  
  if (shifts.length === 0 && overnights.length === 0) {
    addNoShiftsMessage(doc, yPosition);
    return yPosition + 25;
  }

  const sortedShifts = sortByWeekday([...shifts]);
  const sortedOvernights = sortByWeekday([...overnights]);

  // Shifts section header
  doc.setFillColor(220, 53, 69);
  doc.roundedRect(20, yPosition, 170, 12, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TURNOS SELECIONADOS', 25, yPosition + 8);
  yPosition += 18;
  
  let itemIndex = 0;
  
  // Add day shifts
  if (sortedShifts.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text('Turnos Diurnos:', 25, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    sortedShifts.forEach((shift: string) => {
      if (itemIndex % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(20, yPosition - 3, 170, 8, 'F');
      }
      doc.text(`• ${shift}`, 30, yPosition + 2);
      yPosition += 8;
      itemIndex++;
    });
    
    yPosition += 5;
    
    if (shiftNotes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text('Observações dos Turnos:', 25, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const shiftNotesText = doc.splitTextToSize(shiftNotes, 160);
      doc.text(shiftNotesText, 30, yPosition);
      yPosition += shiftNotesText.length * 4 + 8;
    }
  }
  
  // Add overnight shifts
  if (sortedOvernights.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text('Pernoites:', 25, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    sortedOvernights.forEach((overnight: string) => {
      if (itemIndex % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(20, yPosition - 3, 170, 8, 'F');
      }
      doc.text(`• ${overnight}`, 30, yPosition + 2);
      yPosition += 8;
      itemIndex++;
    });
    
    yPosition += 5;
    
    if (overnightNotes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text('Observações das Pernoites:', 25, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const overnightNotesText = doc.splitTextToSize(overnightNotes, 160);
      doc.text(overnightNotesText, 30, yPosition);
      yPosition += overnightNotesText.length * 4 + 8;
    }
  }
  
  // Summary box
  yPosition += 5;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(20, yPosition, 170, 20, 3, 3, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, yPosition, 170, 20, 3, 3, 'S');
  
  doc.setTextColor(220, 53, 69);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO', 25, yPosition + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Turnos Diurnos: ${sortedShifts.length}`, 25, yPosition + 15);
  doc.text(`Pernoites: ${sortedOvernights.length}`, 100, yPosition + 15);
  
  return yPosition + 25;
};

const addNoShiftsMessage = (doc: jsPDF, yPosition: number) => {
  doc.setFillColor(255, 249, 196);
  doc.roundedRect(20, yPosition, 170, 20, 3, 3, 'F');
  doc.setTextColor(133, 77, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Nenhum turno selecionado para este mês', 105, yPosition + 12, { align: 'center' });
};

const addFooter = (doc: jsPDF) => {
  doc.setDrawColor(240, 240, 240);
  doc.setLineWidth(0.5);
  doc.line(20, 280, 190, 280);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  const footerText = `Documento gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`;
  doc.text(footerText, 105, 287, { align: 'center' });
};

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

  const filteredSchedules = schedules
    .filter(schedule => selectedUsers.includes(schedule.user_email || schedule.email))
    .sort((a, b) => {
      const nameA = (a.user_name || '').toLowerCase();
      const nameB = (b.user_name || '').toLowerCase();
      return nameA.localeCompare(nameB, 'pt');
    });
  
  console.log('Filtered schedules for PDF (sorted alphabetically):', filteredSchedules);
  console.log('Selected users:', selectedUsers);

  if (filteredSchedules.length === 0) {
    toast({
      title: "Sem escalas",
      description: "Nenhuma escala encontrada para os utilizadores selecionados.",
      variant: "destructive",
    });
    return;
  }

  try {
    const doc = new jsPDF();
    const totalPages = filteredSchedules.length;
    
    for (let i = 0; i < filteredSchedules.length; i++) {
      const schedule = filteredSchedules[i];
      
      if (i > 0) {
        doc.addPage();
      }
      
      await addHeader(doc, i + 1, totalPages);
      addTitle(doc);
      addUserInfo(doc, schedule);
      addShifts(doc, schedule.dates);
      addFooter(doc);
    }
    
    doc.save(`escalas_utilizadores_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "Exportação concluída",
      description: `Exportados dados de ${filteredSchedules.length} utilizador(es) em formato PDF.`,
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
