
import jsPDF from 'jspdf';
import { getDayType } from '@/utils/dateUtils';

interface PDFData {
  userEmail: string;
  userName: string;
  mechanographicNumber: string;
  scheduleData: any;
}

export class PDFGenerator {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  private async addHeader() {
    try {
      // Add header background
      this.doc.setFillColor(220, 53, 69); // Cruz Vermelha red
      this.doc.roundedRect(20, 10, 170, 45, 3, 3, 'F');
      
      // Add logo placeholder (since we can't load external images directly in jsPDF)
      this.doc.setFillColor(255, 255, 255);
      this.doc.circle(40, 32, 15, 'F');
      
      // Add Cruz symbol
      this.doc.setTextColor(220, 53, 69);
      this.doc.setFontSize(20);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('+', 40, 37, { align: 'center' });
      
      // Add organization text
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(18);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Cruz Vermelha Portuguesa', 65, 25);
      
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('Delegação de Amares', 65, 35);
      
      this.doc.setFontSize(11);
      this.doc.text('Sistema de Gestão de Escalas', 65, 43);
      
    } catch (error) {
      console.error('Error adding header:', error);
      // Fallback header
      this.doc.setFillColor(220, 53, 69);
      this.doc.roundedRect(20, 10, 170, 45, 3, 3, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(18);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Cruz Vermelha Portuguesa', 105, 32, { align: 'center' });
    }
  }

  private addTitle() {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const monthName = targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Escala de Serviço - ${monthName}`, 105, 75, { align: 'center' });
  }

  private addUserInfo(userData: PDFData) {
    // User info section
    this.doc.setFillColor(248, 249, 250);
    this.doc.roundedRect(20, 85, 170, 50, 3, 3, 'F');
    this.doc.setDrawColor(220, 53, 69);
    this.doc.setLineWidth(1);
    this.doc.roundedRect(20, 85, 170, 50, 3, 3, 'S');
    
    this.doc.setTextColor(220, 53, 69);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DADOS DO COLABORADOR', 25, 98);
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Nome: ${userData.userName}`, 25, 112);
    this.doc.text(`Número Mecanográfico: ${userData.mechanographicNumber}`, 25, 122);
    this.doc.text(`Email: ${userData.userEmail}`, 25, 132);
  }

  private formatShiftForPDF(dateStr: string, shiftType: string): string {
    console.log('Formatting shift for PDF:', { dateStr, shiftType, dateType: typeof dateStr });
    
    try {
      let date: Date;
      
      // Parse the date string correctly
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        // Handle YYYY-MM-DD format
        const [year, month, day] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        date = new Date(dateStr);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateStr);
        return `• Data inválida - ${shiftType}`;
      }
      
      // Format the date in Portuguese
      const formattedDate = date.toLocaleDateString('pt-PT', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const dayType = getDayType(dateStr);
      let shiftLabel = '';
      
      // Determine shift label based on day type and shift type
      if (dayType === 'weekday') {
        shiftLabel = shiftType === 'day' ? 'Turno Diurno' : 'Pernoite';
      } else {
        switch (shiftType) {
          case 'morning': shiftLabel = 'Turno Manhã'; break;
          case 'afternoon': shiftLabel = 'Turno Tarde'; break;
          case 'night': shiftLabel = 'Turno Noite'; break;
          case 'day': shiftLabel = 'Turno Diurno'; break;
          case 'overnight': shiftLabel = 'Pernoite'; break;
          default: shiftLabel = shiftType;
        }
      }
      
      const dayTypeLabel = dayType === 'holiday' ? ' (Feriado)' : 
                          dayType === 'weekend' ? ' (Fim de semana)' : '';
      
      return `• ${formattedDate}${dayTypeLabel} - ${shiftLabel}`;
    } catch (error) {
      console.error('Error formatting shift:', error);
      return `• Erro ao formatar data - ${shiftType}`;
    }
  }

  private addShifts(scheduleData: any): number {
    let yPosition = 150;
    
    if (scheduleData && typeof scheduleData === 'object') {
      const allShifts = [];
      
      console.log('Processing schedule data for PDF:', scheduleData);
      
      // Process shifts array
      if (scheduleData.shifts && Array.isArray(scheduleData.shifts)) {
        scheduleData.shifts.forEach((date: string) => {
          allShifts.push({ date, shift: 'day' });
        });
      }
      
      // Process overnights array
      if (scheduleData.overnights && Array.isArray(scheduleData.overnights)) {
        scheduleData.overnights.forEach((date: string) => {
          allShifts.push({ date, shift: 'overnight' });
        });
      }
      
      // Sort shifts by date
      allShifts.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      if (allShifts.length > 0) {
        // Shifts section header
        this.doc.setFillColor(220, 53, 69);
        this.doc.roundedRect(20, yPosition, 170, 12, 2, 2, 'F');
        
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('TURNOS SELECIONADOS', 25, yPosition + 8);
        yPosition += 20;
        
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        
        allShifts.forEach(({ date, shift }, index) => {
          const formattedShift = this.formatShiftForPDF(date, shift);
          
          // Add alternating background
          if (index % 2 === 0) {
            this.doc.setFillColor(248, 249, 250);
            this.doc.rect(20, yPosition - 4, 170, 10, 'F');
          }
          
          this.doc.text(formattedShift, 25, yPosition + 2);
          yPosition += 10;
          
          // Add new page if needed
          if (yPosition > 260) {
            this.doc.addPage();
            yPosition = 20;
          }
        });
        
        // Add summary box
        yPosition += 15;
        this.doc.setFillColor(240, 248, 255);
        this.doc.roundedRect(20, yPosition, 170, 30, 2, 2, 'F');
        this.doc.setDrawColor(54, 162, 235);
        this.doc.setLineWidth(0.5);
        this.doc.roundedRect(20, yPosition, 170, 30, 2, 2, 'S');
        
        this.doc.setTextColor(54, 162, 235);
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('RESUMO', 25, yPosition + 10);
        
        this.doc.setTextColor(0, 0, 0);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        const totalShifts = scheduleData.shifts?.length || 0;
        const totalOvernights = scheduleData.overnights?.length || 0;
        this.doc.text(`Total de Turnos Diurnos: ${totalShifts}`, 25, yPosition + 18);
        this.doc.text(`Total de Pernoites: ${totalOvernights}`, 25, yPosition + 25);
        
        yPosition += 40;
      } else {
        this.doc.setFillColor(255, 249, 196);
        this.doc.roundedRect(20, yPosition, 170, 25, 2, 2, 'F');
        this.doc.setTextColor(133, 77, 14);
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'italic');
        this.doc.text('Nenhum turno selecionado para este mês', 105, yPosition + 15, { align: 'center' });
        yPosition += 35;
      }
    }
    
    return yPosition;
  }

  private addNotes(scheduleData: any, yPosition: number): number {
    if (scheduleData?.shiftNotes || scheduleData?.overnightNotes) {
      this.doc.setFillColor(220, 53, 69);
      this.doc.roundedRect(20, yPosition, 170, 12, 2, 2, 'F');
      
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('OBSERVAÇÕES', 25, yPosition + 8);
      yPosition += 20;
      
      this.doc.setTextColor(0, 0, 0);
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      
      if (scheduleData.shiftNotes) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Notas dos Turnos:', 25, yPosition);
        yPosition += 6;
        this.doc.setFont('helvetica', 'normal');
        const shiftNotesText = this.doc.splitTextToSize(scheduleData.shiftNotes, 160);
        this.doc.text(shiftNotesText, 30, yPosition);
        yPosition += shiftNotesText.length * 5 + 8;
      }
      
      if (scheduleData.overnightNotes) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Notas das Pernoites:', 25, yPosition);
        yPosition += 6;
        this.doc.setFont('helvetica', 'normal');
        const overnightNotesText = this.doc.splitTextToSize(scheduleData.overnightNotes, 160);
        this.doc.text(overnightNotesText, 30, yPosition);
        yPosition += overnightNotesText.length * 5 + 8;
      }
    }
    
    return yPosition;
  }

  private addFooter() {
    this.doc.setDrawColor(220, 53, 69);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 285, 190, 285);
    
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    const footerText = `Documento gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`;
    this.doc.text(footerText, 105, 292, { align: 'center' });
  }

  async generatePDF(pdfData: PDFData): Promise<void> {
    try {
      console.log('Starting PDF generation with data:', pdfData);
      
      await this.addHeader();
      this.addTitle();
      this.addUserInfo(pdfData);
      
      const yPosition = this.addShifts(pdfData.scheduleData);
      this.addNotes(pdfData.scheduleData, yPosition);
      this.addFooter();
      
      const fileName = `Escala_${pdfData.userName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).replace(/\s+/g, '_')}.pdf`;
      console.log('Saving PDF as:', fileName);
      this.doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}
