
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
    
    // Handle different date formats
    let date;
    if (typeof dateStr === 'string') {
      // Try parsing the date string
      date = new Date(dateStr);
      
      // If invalid, try other formats
      if (isNaN(date.getTime())) {
        // Try parsing as YYYY-MM-DD format
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
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
    
    const dayType = getDayType(date.toISOString().split('T')[0]);
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

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const now = new Date();
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1);
      const monthName = targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
      
      console.log('PDF Generation - Schedule data:', scheduleData);
      console.log('PDF Generation - User info:', { userName, mechanographicNumber });
      
      // Add logo
      try {
        const logoUrl = 'https://amares.cruzvermelha.pt/images/site/Amares.webp';
        // Note: In a real implementation, you'd need to convert the image to base64
        // For now, we'll add a text placeholder
      } catch (error) {
        console.log('Could not load logo for PDF');
      }
      
      // Header with improved styling
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Cruz Vermelha Portuguesa - Amares', 105, 20, { align: 'center' });
      
      // Add a line under header
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Escala de Serviço - ${monthName}`, 105, 35, { align: 'center' });
      
      // User info box
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.rect(20, 45, 170, 25);
      doc.text(`Nome: ${userName}`, 25, 55);
      doc.text(`Número Mecanográfico: ${mechanographicNumber}`, 25, 62);
      doc.text(`Email: ${userEmail}`, 25, 69);
      
      let yPosition = 85;
      
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
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Turnos Selecionados:', 20, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          allShifts.forEach(({ date, shift }) => {
            const formattedShift = formatShiftForPDF(date, shift);
            console.log(`Adding to PDF: ${formattedShift}`);
            doc.text(formattedShift, 25, yPosition);
            yPosition += 7;
            
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
          doc.text('Nenhum turno selecionado', 25, yPosition);
          yPosition += 15;
        }
      } else {
        console.log('Invalid schedule data format');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.text('Dados de escala inválidos', 25, yPosition);
        yPosition += 15;
      }
      
      yPosition += 15;
      
      // Notes section with improved formatting
      if (scheduleData?.shiftNotes || scheduleData?.overnightNotes) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (scheduleData.shiftNotes) {
          doc.setFont('helvetica', 'bold');
          doc.text('Turnos:', 25, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          const shiftNotesText = doc.splitTextToSize(scheduleData.shiftNotes, 160);
          doc.text(shiftNotesText, 30, yPosition);
          yPosition += shiftNotesText.length * 5 + 8;
        }
        
        if (scheduleData.overnightNotes) {
          doc.setFont('helvetica', 'bold');
          doc.text('Pernoites:', 25, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          const overnightNotesText = doc.splitTextToSize(scheduleData.overnightNotes, 160);
          doc.text(overnightNotesText, 30, yPosition);
          yPosition += overnightNotesText.length * 5 + 8;
        }
      }
      
      // Footer with line
      doc.setLineWidth(0.3);
      doc.line(20, 275, 190, 275);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
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
