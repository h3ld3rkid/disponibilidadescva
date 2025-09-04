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
      // Clean white background for header
      this.doc.setFillColor(255, 255, 255);
      this.doc.rect(0, 0, 210, 50, 'F');
      
      // Load and add logo from uploaded image
      try {
        const logoUrl = '/lovable-uploads/a1f20fae-1bb5-44e2-ab03-37a1183b39d8.png';
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        const logoBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        // Add logo to PDF - positioned on the left
        this.doc.addImage(logoBase64, 'PNG', 20, 15, 40, 20);
      } catch (error) {
        console.warn('Could not load logo, using fallback:', error);
        // Fallback - Cruz Vermelha cross
        this.doc.setFillColor(220, 53, 69);
        this.doc.roundedRect(20, 15, 40, 20, 2, 2, 'F');
        
        // Draw Cruz Vermelha cross
        this.doc.setFillColor(255, 255, 255);
        this.doc.rect(35, 18, 4, 14, 'F'); // Vertical bar
        this.doc.rect(25, 23, 24, 4, 'F'); // Horizontal bar
      }
      
      // Main title - immediately to the right of logo
      this.doc.setTextColor(220, 53, 69);
      this.doc.setFontSize(18);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Cruz Vermelha de Amares', 70, 22);
      
      // Subtitle - below main title
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(100, 100, 100);
      this.doc.text('Sistema de Gestão de Disponibilidades', 70, 30);
      
      // Add a subtle separator line
      this.doc.setDrawColor(220, 220, 220);
      this.doc.setLineWidth(0.5);
      this.doc.line(20, 45, 190, 45);
      
    } catch (error) {
      console.error('Error adding header:', error);
      // Fallback header
      this.doc.setTextColor(220, 53, 69);
      this.doc.setFontSize(18);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Cruz Vermelha de Amares', 105, 25, { align: 'center' });
    }
  }

  private getScheduleMonth(): string {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  }

  private addTitle() {
    const monthName = this.getScheduleMonth();
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Escala de Serviço - ${monthName}`, 105, 60, { align: 'center' });
  }

  private addUserInfo(userData: PDFData) {
    // Modern user info section with subtle styling
    this.doc.setFillColor(250, 250, 250);
    this.doc.roundedRect(20, 70, 170, 30, 5, 5, 'F');
    this.doc.setDrawColor(240, 240, 240);
    this.doc.setLineWidth(1);
    this.doc.roundedRect(20, 70, 170, 30, 5, 5, 'S');
    
    this.doc.setTextColor(220, 53, 69);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('COLABORADOR', 25, 80);
    
    this.doc.setTextColor(60, 60, 60);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Nome: ${userData.userName}`, 25, 87);
    this.doc.text(`Nº Mecanográfico: ${userData.mechanographicNumber}`, 25, 94);
  }

  private formatDateForPDF(dateStr: string): string {
    try {
      console.log('Formatting date for PDF:', dateStr);
      
      // Check if it's just a weekday name (not a full date)
      const weekdays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
      if (weekdays.includes(dateStr)) {
        return dateStr;
      }
      
      // Try to parse as date
      const date = new Date(dateStr + 'T00:00:00');
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateStr);
        return dateStr; // Return original string instead of "Data inválida"
      }
      
      // Format the date in Portuguese
      const formattedDate = date.toLocaleDateString('pt-PT', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const dayType = getDayType(dateStr);
      const dayTypeLabel = dayType === 'holiday' ? ' (Feriado)' : 
                          dayType === 'weekend' ? ' (Fim de semana)' : '';
      
      return `${formattedDate}${dayTypeLabel}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'for dateStr:', dateStr);
      return dateStr; // Return original string instead of error message
    }
  }

  private addShifts(scheduleData: any): number {
    let yPosition = 110;
    
    console.log('Processing schedule data for PDF:', scheduleData);
    
    if (!scheduleData || typeof scheduleData !== 'object') {
      console.log('No valid schedule data found');
      this.addNoShiftsMessage(yPosition);
      return yPosition + 25;
    }

    const shifts = scheduleData.shifts || [];
    const overnights = scheduleData.overnights || [];
    
    console.log('Shifts found:', shifts);
    console.log('Overnights found:', overnights);
    
    if (shifts.length === 0 && overnights.length === 0) {
      this.addNoShiftsMessage(yPosition);
      return yPosition + 25;
    }

    // Modern shifts section header
    this.doc.setFillColor(220, 53, 69);
    this.doc.roundedRect(20, yPosition, 170, 12, 3, 3, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TURNOS SELECIONADOS', 25, yPosition + 8);
    yPosition += 18;
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    
    let itemIndex = 0;
    
    // Add day shifts
    if (shifts.length > 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(220, 53, 69);
      this.doc.text('Turnos Diurnos:', 25, yPosition);
      yPosition += 8;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(60, 60, 60);
      
      shifts.forEach((shift) => {
        // Add alternating background for better readability
        if (itemIndex % 2 === 0) {
          this.doc.setFillColor(248, 249, 250);
          this.doc.rect(20, yPosition - 3, 170, 8, 'F');
        }
        
        // Display weekday names directly without date conversion
        this.doc.text(`• ${shift}`, 30, yPosition + 2);
        yPosition += 8;
        itemIndex++;
      });
      
      yPosition += 5;
    }
    
    // Add overnight shifts
    if (overnights.length > 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(220, 53, 69);
      this.doc.text('Pernoites:', 25, yPosition);
      yPosition += 8;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(60, 60, 60);
      
      overnights.forEach((overnight) => {
        // Add alternating background
        if (itemIndex % 2 === 0) {
          this.doc.setFillColor(248, 249, 250);
          this.doc.rect(20, yPosition - 3, 170, 8, 'F');
        }
        
        // Display weekday names directly without date conversion
        this.doc.text(`• ${overnight}`, 30, yPosition + 2);
        yPosition += 8;
        itemIndex++;
      });
    }
    
    // Modern summary box
    yPosition += 10;
    this.doc.setFillColor(245, 247, 250);
    this.doc.roundedRect(20, yPosition, 170, 20, 3, 3, 'F');
    this.doc.setDrawColor(220, 220, 220);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(20, yPosition, 170, 20, 3, 3, 'S');
    
    this.doc.setTextColor(220, 53, 69);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('RESUMO', 25, yPosition + 8);
    
    this.doc.setTextColor(60, 60, 60);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Turnos Diurnos: ${shifts.length}`, 25, yPosition + 15);
    this.doc.text(`Pernoites: ${overnights.length}`, 100, yPosition + 15);
    
    return yPosition + 25;
  }

  private addNoShiftsMessage(yPosition: number) {
    this.doc.setFillColor(255, 249, 196);
    this.doc.roundedRect(20, yPosition, 170, 20, 3, 3, 'F');
    this.doc.setTextColor(133, 77, 14);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Nenhum turno selecionado para este mês', 105, yPosition + 12, { align: 'center' });
  }

  private addNotes(scheduleData: any, yPosition: number): number {
    if (!scheduleData) return yPosition;
    
    const shiftNotes = scheduleData.shiftNotes || scheduleData.shift_notes || '';
    const overnightNotes = scheduleData.overnightNotes || scheduleData.overnight_notes || '';
    const generalNotes = scheduleData.notes || '';
    
    if (!shiftNotes && !overnightNotes && !generalNotes) return yPosition;
    
    // Modern notes header
    this.doc.setFillColor(220, 53, 69);
    this.doc.roundedRect(20, yPosition, 170, 12, 3, 3, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('OBSERVAÇÕES', 25, yPosition + 8);
    yPosition += 18;
    
    this.doc.setTextColor(60, 60, 60);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    
    if (generalNotes) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(220, 53, 69);
      this.doc.text('Notas Gerais:', 25, yPosition);
      yPosition += 5;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(60, 60, 60);
      const generalNotesText = this.doc.splitTextToSize(generalNotes, 160);
      this.doc.text(generalNotesText, 30, yPosition);
      yPosition += generalNotesText.length * 4 + 5;
    }
    
    if (shiftNotes) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(220, 53, 69);
      this.doc.text('Notas dos Turnos:', 25, yPosition);
      yPosition += 5;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(60, 60, 60);
      const shiftNotesText = this.doc.splitTextToSize(shiftNotes, 160);
      this.doc.text(shiftNotesText, 30, yPosition);
      yPosition += shiftNotesText.length * 4 + 5;
    }
    
    if (overnightNotes) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(220, 53, 69);
      this.doc.text('Notas das Pernoites:', 25, yPosition);
      yPosition += 5;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(60, 60, 60);
      const overnightNotesText = this.doc.splitTextToSize(overnightNotes, 160);
      this.doc.text(overnightNotesText, 30, yPosition);
      yPosition += overnightNotesText.length * 4 + 5;
    }
    
    return yPosition;
  }

  private addFooter() {
    this.doc.setDrawColor(240, 240, 240);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 280, 190, 280);
    
    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(150, 150, 150);
    const footerText = `Documento gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`;
    this.doc.text(footerText, 105, 287, { align: 'center' });
  }

  async generatePDF(pdfData: PDFData): Promise<void> {
    try {
      console.log('Starting PDF generation with data:', pdfData);
      console.log('Schedule data structure:', JSON.stringify(pdfData.scheduleData, null, 2));
      
      await this.addHeader();
      this.addTitle();
      this.addUserInfo(pdfData);
      
      const yPosition = this.addShifts(pdfData.scheduleData);
      this.addNotes(pdfData.scheduleData, yPosition);
      this.addFooter();
      
      const fileName = `Escala_${pdfData.userName.replace(/\s+/g, '_')}_${this.getScheduleMonth().replace(/\s+/g, '_')}.pdf`;
      console.log('Saving PDF as:', fileName);
      this.doc.save(fileName);
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}
