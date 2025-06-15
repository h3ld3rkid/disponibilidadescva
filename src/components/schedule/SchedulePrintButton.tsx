
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import jsPDF from 'jspdf';

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
      
      // User info
      doc.setFontSize(12);
      doc.text(`Nome: ${userName}`, 20, 55);
      doc.text(`Número Mecanográfico: ${mechanographicNumber}`, 20, 65);
      
      let yPosition = 85;
      
      // Regular shifts
      if (scheduleData.shifts && scheduleData.shifts.length > 0) {
        doc.setFontSize(14);
        doc.text('Turnos Regulares:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(11);
        scheduleData.shifts.forEach((shift: string) => {
          const date = new Date(shift);
          const formattedDate = date.toLocaleDateString('pt-PT', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          doc.text(`• ${formattedDate}`, 30, yPosition);
          yPosition += 8;
        });
      }
      
      yPosition += 10;
      
      // Overnight shifts
      if (scheduleData.overnights && scheduleData.overnights.length > 0) {
        doc.setFontSize(14);
        doc.text('Pernoites:', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(11);
        scheduleData.overnights.forEach((overnight: string) => {
          const date = new Date(overnight);
          const formattedDate = date.toLocaleDateString('pt-PT', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          doc.text(`• ${formattedDate}`, 30, yPosition);
          yPosition += 8;
        });
      }
      
      yPosition += 15;
      
      // Notes for shifts
      if (scheduleData.shiftNotes) {
        doc.setFontSize(14);
        doc.text('Observações dos Turnos:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(scheduleData.shiftNotes, 170);
        doc.text(splitText, 20, yPosition);
        yPosition += splitText.length * 6 + 10;
      }
      
      // Notes for overnights
      if (scheduleData.overnightNotes) {
        doc.setFontSize(14);
        doc.text('Observações dos Pernoites:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(scheduleData.overnightNotes, 170);
        doc.text(splitText, 20, yPosition);
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
