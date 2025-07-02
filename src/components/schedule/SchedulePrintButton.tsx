
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import jsPDF from 'jspdf';
import { getDayType } from '@/utils/dateUtils';

interface SchedulePrintButtonProps {
  userEmail: string;
  userName: string;
  mechanographicNumber: string;
  scheduleData: any;
  printedAt: string | null;
  onPrintComplete: () => void;
}

const SchedulePrintButton: React.FC<SchedulePrintButtonProps> = ({
  userEmail,
  userName,
  mechanographicNumber,
  scheduleData,
  printedAt,
  onPrintComplete
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const formatShiftForPDF = (dateStr: string, shiftType: string) => {
    console.log('Formatting date for PDF:', dateStr, 'type:', typeof dateStr);
    
    let date;
    
    // Better date parsing - handle YYYY-MM-DD format specifically
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed in JavaScript
        const day = parseInt(parts[2]);
        date = new Date(year, month, day);
        console.log('Parsed date components - Year:', year, 'Month:', month, 'Day:', day);
      } else {
        console.error('Invalid date format:', dateStr);
        return `• Data inválida - ${shiftType}`;
      }
    } else {
      date = new Date(dateStr);
    }
    
    // Validate the parsed date
    if (isNaN(date.getTime())) {
      console.error('Invalid date after parsing:', dateStr, date);
      return `• Data inválida - ${shiftType}`;
    }
    
    console.log('Successfully parsed date:', date);
    
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
  };

  const addLogoToPDF = async (doc: jsPDF) => {
    try {
      // Try to load and add the official logo
      const logoUrl = 'https://amares.cruzvermelha.pt/images/site/Amares.webp';
      
      // For now, we'll add a placeholder since we can't directly load external images in jsPDF
      // In a production environment, you'd want to convert the image to base64 first
      
      // Add a styled header background
      doc.setFillColor(220, 53, 69); // Cruz Vermelha red
      doc.roundedRect(20, 10, 170, 40, 3, 3, 'F');
      
      // Add logo placeholder circle
      doc.setFillColor(255, 255, 255);
      doc.circle(35, 30, 12, 'F');
      
      // Add Cruz symbol
      doc.setTextColor(220, 53, 69);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('+', 35, 33, { align: 'center' });
      
      // Add text on the header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Cruz Vermelha Portuguesa', 55, 25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Delegação de Amares', 55, 35);
      doc.setFontSize(10);
      doc.text('Sistema de Gestão de Escalas', 55, 42);
      
    } catch (error) {
      console.error('Error adding logo:', error);
      // Fallback to simple header
      doc.setFillColor(220, 53, 69);
      doc.roundedRect(20, 10, 170, 40, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Cruz Vermelha Portuguesa', 105, 30, { align: 'center' });
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const now = new Date();
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1);
      const monthName = targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
      
      console.log('PDF Generation - Schedule data:', scheduleData);
      console.log('PDF Generation - User info:', { userName, mechanographicNumber });
      
      // Add logo and header
      await addLogoToPDF(doc);
      
      // Title section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Escala de Serviço - ${monthName}`, 105, 70, { align: 'center' });
      
      // User info section with improved styling
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(20, 80, 170, 45, 3, 3, 'F');
      doc.setDrawColor(220, 53, 69);
      doc.setLineWidth(1);
      doc.roundedRect(20, 80, 170, 45, 3, 3, 'S');
      
      doc.setTextColor(220, 53, 69);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO COLABORADOR', 25, 92);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nome: ${userName}`, 25, 105);
      doc.text(`Número Mecanográfico: ${mechanographicNumber}`, 25, 113);
      doc.text(`Email: ${userEmail}`, 25, 121);
      
      let yPosition = 140;
      
      // Process schedule data
      if (scheduleData && typeof scheduleData === 'object') {
        const allShifts = [];
        
        console.log('Processing schedule data for PDF:', scheduleData);
        
        // Handle shifts array - ensure we're working with the correct data structure
        if (scheduleData.shifts && Array.isArray(scheduleData.shifts)) {
          scheduleData.shifts.forEach((date: string) => {
            console.log(`Adding shift: ${date} - day`);
            allShifts.push({ date, shift: 'day' });
          });
        }
        
        // Handle overnights array
        if (scheduleData.overnights && Array.isArray(scheduleData.overnights)) {
          scheduleData.overnights.forEach((date: string) => {
            console.log(`Adding overnight: ${date} - overnight`);
            allShifts.push({ date, shift: 'overnight' });
          });
        }
        
        console.log('All processed shifts for PDF:', allShifts);
        
        // Sort shifts by date
        allShifts.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        if (allShifts.length > 0) {
          // Shifts section header
          doc.setFillColor(220, 53, 69);
          doc.roundedRect(20, yPosition, 170, 12, 2, 2, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('TURNOS SELECIONADOS', 25, yPosition + 8);
          yPosition += 20;
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          
          allShifts.forEach(({ date, shift }, index) => {
            const formattedShift = formatShiftForPDF(date, shift);
            console.log(`Adding to PDF: ${formattedShift}`);
            
            // Add alternating background for better readability
            if (index % 2 === 0) {
              doc.setFillColor(248, 249, 250);
              doc.rect(20, yPosition - 4, 170, 10, 'F');
            }
            
            doc.text(formattedShift, 25, yPosition + 2);
            yPosition += 10;
            
            // Add new page if needed
            if (yPosition > 260) {
              doc.addPage();
              yPosition = 20;
            }
          });
          
          // Add summary box
          yPosition += 10;
          doc.setFillColor(240, 248, 255);
          doc.roundedRect(20, yPosition, 170, 25, 2, 2, 'F');
          doc.setDrawColor(54, 162, 235);
          doc.setLineWidth(0.5);
          doc.roundedRect(20, yPosition, 170, 25, 2, 2, 'S');
          
          doc.setTextColor(54, 162, 235);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('RESUMO', 25, yPosition + 8);
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const totalShifts = scheduleData.shifts?.length || 0;
          const totalOvernights = scheduleData.overnights?.length || 0;
          doc.text(`Total de Turnos Diurnos: ${totalShifts}`, 25, yPosition + 16);
          doc.text(`Total de Pernoites: ${totalOvernights}`, 25, yPosition + 22);
          
          yPosition += 35;
        } else {
          console.log('No shifts found, adding "no shifts" message');
          doc.setFillColor(255, 249, 196);
          doc.roundedRect(20, yPosition, 170, 20, 2, 2, 'F');
          doc.setTextColor(133, 77, 14);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'italic');
          doc.text('Nenhum turno selecionado para este mês', 105, yPosition + 12, { align: 'center' });
          yPosition += 30;
        }
      }
      
      // Notes section
      if (scheduleData?.shiftNotes || scheduleData?.overnightNotes) {
        doc.setFillColor(220, 53, 69);
        doc.roundedRect(20, yPosition, 170, 12, 2, 2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVAÇÕES', 25, yPosition + 8);
        yPosition += 20;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (scheduleData.shiftNotes) {
          doc.setFont('helvetica', 'bold');
          doc.text('Notas dos Turnos:', 25, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          const shiftNotesText = doc.splitTextToSize(scheduleData.shiftNotes, 160);
          doc.text(shiftNotesText, 30, yPosition);
          yPosition += shiftNotesText.length * 5 + 8;
        }
        
        if (scheduleData.overnightNotes) {
          doc.setFont('helvetica', 'bold');
          doc.text('Notas das Pernoites:', 25, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          const overnightNotesText = doc.splitTextToSize(scheduleData.overnightNotes, 160);
          doc.text(overnightNotesText, 30, yPosition);
          yPosition += overnightNotesText.length * 5 + 8;
        }
      }
      
      // Footer
      doc.setDrawColor(220, 53, 69);
      doc.setLineWidth(0.5);
      doc.line(20, 285, 190, 285);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const footerText = `Documento gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`;
      doc.text(footerText, 105, 292, { align: 'center' });
      
      // Save PDF
      const fileName = `Escala_${userName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.pdf`;
      console.log(`Saving PDF as: ${fileName}`);
      doc.save(fileName);
      
      // Mark as printed in database
      const result = await scheduleService.markScheduleAsPrinted(userEmail);
      
      if (result.success) {
        toast({
          title: "PDF gerado com sucesso",
          description: "A escala foi impressa e marcada como tal.",
        });
        onPrintComplete();
      } else {
        throw new Error("Failed to mark as printed");
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isPrinted = !!printedAt;

  return (
    <Button
      onClick={generatePDF}
      disabled={isGenerating}
      variant={isPrinted ? "secondary" : "default"}
      size="sm"
      className="flex items-center gap-2"
    >
      {isPrinted ? (
        <>
          <Check className="h-4 w-4" />
          Já Impresso
        </>
      ) : (
        <>
          <Printer className="h-4 w-4" />
          {isGenerating ? 'A gerar PDF...' : 'Imprimir PDF'}
        </>
      )}
    </Button>
  );
};

export default SchedulePrintButton;
