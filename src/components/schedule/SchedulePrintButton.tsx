
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
      
      // Header
      doc.setFontSize(20);
      doc.text('Cruz Vermelha Portuguesa - Amares', 20, 20);
      
      doc.setFontSize(16);
      doc.text(`Escala - ${monthName}`, 20, 35);
      
      // User info - FIXED: Now shows mechanographic number correctly
      doc.setFontSize(12);
      doc.text(`Nome: ${userName}`, 20, 55);
      doc.text(`Número Mecanográfico: ${mechanographicNumber}`, 20, 65);
      
      let yPosition = 85;
      
      // FIXED: Process all shifts correctly from scheduleData
      if (scheduleData && typeof scheduleData === 'object') {
        const allShifts = [];
        
        // Handle different schedule data formats
        if (scheduleData.dates) {
          // New format with dates object
          Object.entries(scheduleData.dates).forEach(([date, shifts]: [string, any]) => {
            if (Array.isArray(shifts)) {
              shifts.forEach(shift => {
                allShifts.push({ date, shift });
              });
            } else if (typeof shifts === 'object' && shifts !== null) {
              Object.entries(shifts).forEach(([shiftType, isSelected]) => {
                if (isSelected) {
                  allShifts.push({ date, shift: shiftType });
                }
              });
            }
          });
        } else {
          // Legacy format - direct date keys
          Object.entries(scheduleData).forEach(([date, shifts]: [string, any]) => {
            // Skip non-date keys
            if (date === 'notes' || !date.includes('-')) return;
            
            if (Array.isArray(shifts)) {
              shifts.forEach(shift => {
                allShifts.push({ date, shift });
              });
            } else if (typeof shifts === 'object' && shifts !== null) {
              Object.entries(shifts).forEach(([shiftType, isSelected]) => {
                if (isSelected) {
                  allShifts.push({ date, shift: shiftType });
                }
              });
            }
          });
        }
        
        // Sort shifts by date
        allShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (allShifts.length > 0) {
          doc.setFontSize(14);
          doc.text('Turnos Selecionados:', 20, yPosition);
          yPosition += 15;
          
          doc.setFontSize(11);
          allShifts.forEach(({ date, shift }) => {
            const formattedShift = formatShiftForPDF(date, shift);
            doc.text(formattedShift, 25, yPosition);
            yPosition += 8;
            
            // Add new page if needed
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
          });
        } else {
          doc.setFontSize(12);
          doc.text('Nenhum turno selecionado', 20, yPosition);
          yPosition += 15;
        }
      }
      
      yPosition += 15;
      
      // Notes
      const notes = scheduleData?.notes || (scheduleData?.dates?.notes);
      if (notes) {
        doc.setFontSize(14);
        doc.text('Observações:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(notes, 170);
        doc.text(splitText, 20, yPosition);
        yPosition += splitText.length * 6 + 10;
      }
      
      // Footer
      doc.setFontSize(8);
      doc.text(`Impresso em: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`, 20, 280);
      
      // Save PDF
      doc.save(`Escala_${userName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.pdf`);
      
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
