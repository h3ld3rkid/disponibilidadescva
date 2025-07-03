
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
      // Add header background - smaller height
      this.doc.setFillColor(220, 53, 69); // Cruz Vermelha red
      this.doc.roundedRect(20, 10, 170, 30, 3, 3, 'F');
      
      // Load and add logo from URL
      try {
        const logoUrl = 'https://amares.cruzvermelha.pt/images/site/Amares.webp';
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        const logoBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        // Add logo to PDF
        this.doc.addImage(logoBase64, 'WEBP', 25, 15, 20, 20);
      } catch (error) {
        console.warn('Could not load logo, using fallback:', error);
        // Fallback - simple white rectangle with cross
        this.doc.setFillColor(255, 255, 255);
        this.doc.roundedRect(25, 15, 20, 20, 2, 2, 'F');
        
        // Draw Cruz Vermelha cross
        this.doc.setFillColor(220, 53, 69);
        // Vertical bar of cross
        this.doc.rect(33, 18, 2, 14, 'F');
        // Horizontal bar of cross
        this.doc.rect(28, 23, 12, 2, 'F');
      }
      
      // Add organization text - smaller font sizes
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Cruz Vermelha Portuguesa', 55, 20);
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('Delegação de Amares', 55, 27);
      
      this.doc.setFontSize(8);
      this.doc.text('Sistema de Gestão de Escalas', 55, 33);
      
    } catch (error) {
      console.error('Error adding header:', error);
      // Fallback header
      this.doc.setFillColor(220, 53, 69);
      this.doc.roundedRect(20, 10, 170, 30, 3, 3, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Cruz Vermelha Portuguesa', 105, 25, { align: 'center' });
    }
  }

  private addTitle() {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const monthName = targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(16); // Reduced from 20
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Escala de Serviço - ${monthName}`, 105, 55, { align: 'center' }); // Moved up
  }

  private addUserInfo(userData: PDFData) {
    // User info section - smaller height
    this.doc.setFillColor(248, 249, 250);
    this.doc.roundedRect(20, 65, 170, 35, 3, 3, 'F'); // Reduced height from 50 to 35
    this.doc.setDrawColor(220, 53, 69);
    this.doc.setLineWidth(1);
    this.doc.roundedRect(20, 65, 170, 35, 3, 3, 'S');
    
    this.doc.setTextColor(220, 53, 69);
    this.doc.setFontSize(11); // Reduced from 14
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DADOS DO COLABORADOR', 25, 75);
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(10); // Reduced from 12
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Nome: ${userData.userName}`, 25, 84);
    this.doc.text(`Número Mecanográfico: ${userData.mechanographicNumber}`, 25, 91);
    this.doc.text(`Email: ${userData.userEmail}`, 25, 98);
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
    let yPosition = 110; // Moved up from 150
    
    console.log('Processing schedule data for PDF:', scheduleData);
    
    if (!scheduleData || typeof scheduleData !== 'object') {
      console.log('No valid schedule data found');
      this.addNoShiftsMessage(yPosition);
      return yPosition + 25; // Reduced spacing
    }

    const shifts = scheduleData.shifts || [];
    const overnights = scheduleData.overnights || [];
    
    console.log('Shifts found:', shifts);
    console.log('Overnights found:', overnights);
    
    if (shifts.length === 0 && overnights.length === 0) {
      this.addNoShiftsMessage(yPosition);
      return yPosition + 25;
    }

    // Add shifts section header - smaller
    this.doc.setFillColor(220, 53, 69);
    this.doc.roundedRect(20, yPosition, 170, 10, 2, 2, 'F'); // Reduced height from 12 to 10
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10); // Reduced from 12
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TURNOS SELECIONADOS', 25, yPosition + 6);
    yPosition += 15; // Reduced spacing
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(9); // Reduced from 10
    this.doc.setFont('helvetica', 'normal');
    
    let itemIndex = 0;
    
    // Add day shifts
    if (shifts.length > 0) {
      this.doc.setFontSize(10); // Reduced from 11
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Turnos Diurnos:', 25, yPosition);
      yPosition += 6; // Reduced spacing
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      
      shifts.forEach((dateStr) => {
        const formattedDate = this.formatDateForPDF(dateStr);
        
        // Add alternating background
        if (itemIndex % 2 === 0) {
          this.doc.setFillColor(248, 249, 250);
          this.doc.rect(20, yPosition - 3, 170, 8, 'F'); // Reduced height
        }
        
        this.doc.text(`• ${formattedDate}`, 30, yPosition + 2);
        yPosition += 8; // Reduced spacing from 10 to 8
        itemIndex++;
      });
      
      yPosition += 3; // Reduced spacing
    }
    
    // Add overnight shifts
    if (overnights.length > 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Pernoites:', 25, yPosition);
      yPosition += 6;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      
      overnights.forEach((dateStr) => {
        const formattedDate = this.formatDateForPDF(dateStr);
        
        // Add alternating background
        if (itemIndex % 2 === 0) {
          this.doc.setFillColor(248, 249, 250);
          this.doc.rect(20, yPosition - 3, 170, 8, 'F');
        }
        
        this.doc.text(`• ${formattedDate}`, 30, yPosition + 2);
        yPosition += 8;
        itemIndex++;
      });
    }
    
    // Add summary box - smaller
    yPosition += 8; // Reduced spacing
    this.doc.setFillColor(240, 248, 255);
    this.doc.roundedRect(20, yPosition, 170, 20, 2, 2, 'F'); // Reduced height from 30 to 20
    this.doc.setDrawColor(54, 162, 235);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(20, yPosition, 170, 20, 2, 2, 'S');
    
    this.doc.setTextColor(54, 162, 235);
    this.doc.setFontSize(10); // Reduced from 12
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('RESUMO', 25, yPosition + 8);
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(9); // Reduced from 10
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Total de Turnos Diurnos: ${shifts.length}`, 25, yPosition + 14);
    this.doc.text(`Total de Pernoites: ${overnights.length}`, 100, yPosition + 14); // Side by side
    
    return yPosition + 25; // Reduced spacing
  }

  private addNoShiftsMessage(yPosition: number) {
    this.doc.setFillColor(255, 249, 196);
    this.doc.roundedRect(20, yPosition, 170, 20, 2, 2, 'F'); // Reduced height
    this.doc.setTextColor(133, 77, 14);
    this.doc.setFontSize(10); // Reduced from 12
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Nenhum turno selecionado para este mês', 105, yPosition + 12, { align: 'center' });
  }

  private addNotes(scheduleData: any, yPosition: number): number {
    if (!scheduleData) return yPosition;
    
    const shiftNotes = scheduleData.shiftNotes || scheduleData.shift_notes || '';
    const overnightNotes = scheduleData.overnightNotes || scheduleData.overnight_notes || '';
    const generalNotes = scheduleData.notes || '';
    
    if (!shiftNotes && !overnightNotes && !generalNotes) return yPosition;
    
    // Add notes header - smaller
    this.doc.setFillColor(220, 53, 69);
    this.doc.roundedRect(20, yPosition, 170, 10, 2, 2, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('OBSERVAÇÕES', 25, yPosition + 6);
    yPosition += 15;
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(8); // Reduced font size
    this.doc.setFont('helvetica', 'normal');
    
    if (generalNotes) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Notas Gerais:', 25, yPosition);
      yPosition += 4;
      this.doc.setFont('helvetica', 'normal');
      const generalNotesText = this.doc.splitTextToSize(generalNotes, 160);
      this.doc.text(generalNotesText, 30, yPosition);
      yPosition += generalNotesText.length * 3 + 4; // Reduced spacing
    }
    
    if (shiftNotes) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Notas dos Turnos:', 25, yPosition);
      yPosition += 4;
      this.doc.setFont('helvetica', 'normal');
      const shiftNotesText = this.doc.splitTextToSize(shiftNotes, 160);
      this.doc.text(shiftNotesText, 30, yPosition);
      yPosition += shiftNotesText.length * 3 + 4;
    }
    
    if (overnightNotes) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Notas das Pernoites:', 25, yPosition);
      yPosition += 4;
      this.doc.setFont('helvetica', 'normal');
      const overnightNotesText = this.doc.splitTextToSize(overnightNotes, 160);
      this.doc.text(overnightNotesText, 30, yPosition);
      yPosition += overnightNotesText.length * 3 + 4;
    }
    
    return yPosition;
  }

  private addFooter() {
    this.doc.setDrawColor(220, 53, 69);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 285, 190, 285);
    
    this.doc.setFontSize(7); // Reduced from 8
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    const footerText = `Documento gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`;
    this.doc.text(footerText, 105, 292, { align: 'center' });
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
      
      const fileName = `Escala_${pdfData.userName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).replace(/\s+/g, '_')}.pdf`;
      console.log('Saving PDF as:', fileName);
      this.doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}
