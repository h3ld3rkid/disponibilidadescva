
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
    const date = new Date(dateStr);
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

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const now = new Date();
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1);
      const monthName = targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
      
      console.log('PDF Generation - Schedule data:', scheduleData);
      console.log('PDF Generation - User info:', { userName, mechanographicNumber });
      
      // Header
      doc.setFontSize(20);
      doc.text('Cruz Vermelha Portuguesa - Amares', 20, 20);
      
      doc.setFontSize(16);
      doc.text(`Escala - ${monthName}`, 20, 35);
      
      // User info
      doc.setFontSize(12);
      doc.text(`Nome: ${userName}`, 20, 55);
      doc.text(`Número Mecanográfico: ${mechanographicNumber}`, 20, 65);
      
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
        allShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (allShifts.length > 0) {
          doc.setFontSize(14);
          doc.text('Turnos Selecionados:', 20, yPosition);
          yPosition += 15;
          
          doc.setFontSize(11);
          allShifts.forEach(({ date, shift }) => {
            const formattedShift = formatShiftForPDF(date, shift);
            console.log(`Adding to PDF: ${formattedShift}`);
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
          doc.setFontSize(12);
          doc.text('Nenhum turno selecionado', 20, yPosition);
          yPosition += 15;
        }
      } else {
        console.log('Invalid schedule data format');
        doc.setFontSize(12);
        doc.text('Dados de escala inválidos', 20, yPosition);
        yPosition += 15;
      }
      
      yPosition += 15;
      
      // Notes section
      if (scheduleData?.shiftNotes || scheduleData?.overnightNotes) {
        doc.setFontSize(14);
        doc.text('Observações:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        
        if (scheduleData.shiftNotes) {
          doc.text('Turnos:', 20, yPosition);
          yPosition += 6;
          const shiftNotesText = doc.splitTextToSize(scheduleData.shiftNotes, 170);
          doc.text(shiftNotesText, 25, yPosition);
          yPosition += shiftNotesText.length * 6 + 8;
        }
        
        if (scheduleData.overnightNotes) {
          doc.text('Pernoites:', 20, yPosition);
          yPosition += 6;
          const overnightNotesText = doc.splitTextToSize(scheduleData.overnightNotes, 170);
          doc.text(overnightNotesText, 25, yPosition);
          yPosition += overnightNotesText.length * 6 + 8;
        }
      }
      
      // Footer
      doc.setFontSize(8);
      doc.text(`Impresso em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`, 20, 280);
      
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
