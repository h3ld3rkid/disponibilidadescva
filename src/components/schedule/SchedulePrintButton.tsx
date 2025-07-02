
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
    if (typeof dateStr === 'string') {
      // Parse date in YYYY-MM-DD format
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const day = parseInt(parts[2]);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }
    
    // Check if date is still invalid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateStr);
      return `• Data inválida - ${shiftType}`;
    }
    
    const formattedDate = date.toLocaleDateString('pt-PT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const dayType = getDayType(dateStr);
    let shiftLabel = '';
    
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

  const addLogoToPDF = (doc: jsPDF) => {
    // Add a placeholder for logo - in a real implementation, you'd convert the logo to base64
    // For now, we'll add a colored rectangle as placeholder
    doc.setFillColor(220, 53, 69); // Red color for Cruz Vermelha
    doc.roundedRect(20, 15, 30, 30, 3, 3, 'F');
    
    // Add Cruz symbol in white
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('+', 34, 35, { align: 'center' });
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
      
      // Add logo placeholder
      addLogoToPDF(doc);
      
      // Header with improved styling
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Cruz Vermelha Portuguesa', 60, 25);
      doc.setFontSize(14);
      doc.text('Delegação de Amares', 60, 35);
      
      // Add a line under header
      doc.setLineWidth(0.5);
      doc.setDrawColor(220, 53, 69);
      doc.line(20, 50, 190, 50);
      
      // Title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Escala de Serviço - ${monthName}`, 105, 65, { align: 'center' });
      
      // User info section with better formatting
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(20, 75, 170, 35, 2, 2, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO COLABORADOR', 25, 85);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Nome: ${userName}`, 25, 95);
      doc.text(`Número Mecanográfico: ${mechanographicNumber}`, 25, 102);
      doc.text(`Email: ${userEmail}`, 25, 109);
      
      let yPosition = 125;
      
      // Process schedule data to extract user's selected shifts
      if (scheduleData && typeof scheduleData === 'object') {
        const allShifts = [];
        
        console.log('Processing schedule data for PDF:', scheduleData);
        
        // Handle shifts array
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
          doc.roundedRect(20, yPosition, 170, 8, 1, 1, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('TURNOS SELECIONADOS', 25, yPosition + 6);
          yPosition += 18;
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          
          allShifts.forEach(({ date, shift }, index) => {
            const formattedShift = formatShiftForPDF(date, shift);
            console.log(`Adding to PDF: ${formattedShift}`);
            
            // Add alternating background for better readability
            if (index % 2 === 0) {
              doc.setFillColor(248, 249, 250);
              doc.rect(20, yPosition - 4, 170, 8, 'F');
            }
            
            doc.text(formattedShift, 25, yPosition);
            yPosition += 8;
            
            // Add new page if needed
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
          });
        } else {
          console.log('No shifts found, adding "no shifts" message');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text('Nenhum turno selecionado', 25, yPosition);
          yPosition += 15;
        }
      } else {
        console.log('Invalid schedule data format');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Dados de escala inválidos', 25, yPosition);
        yPosition += 15;
      }
      
      yPosition += 10;
      
      // Notes section with improved formatting
      if (scheduleData?.shiftNotes || scheduleData?.overnightNotes) {
        // Notes section header
        doc.setFillColor(220, 53, 69);
        doc.roundedRect(20, yPosition, 170, 8, 1, 1, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVAÇÕES', 25, yPosition + 6);
        yPosition += 18;
        
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
      
      // Footer with line
      doc.setLineWidth(0.3);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 275, 190, 275);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Documento gerado em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`, 105, 285, { align: 'center' });
      
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
