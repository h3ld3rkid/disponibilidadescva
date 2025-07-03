
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import { userService } from "@/services/supabase/userService";
import { PDFGenerator } from './PDFGenerator';

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
      console.log('PDF Generation - Schedule data:', scheduleData);
      console.log('PDF Generation - User info:', { userName, mechanographicNumber });
      
      // Get the actual user data to ensure we have the correct mechanographic number
      let actualMechanographicNumber = mechanographicNumber;
      let actualUserName = userName;
      
      try {
        const allUsers = await userService.getAllUsers();
        const user = allUsers.find(u => u.email === userEmail);
        if (user) {
          actualMechanographicNumber = user.mechanographic_number;
          actualUserName = user.name;
        }
      } catch (error) {
        console.warn('Could not fetch user details, using provided data:', error);
      }
      
      const pdfGenerator = new PDFGenerator();
      await pdfGenerator.generatePDF({
        userEmail,
        userName: actualUserName,
        mechanographicNumber: actualMechanographicNumber,
        scheduleData
      });
      
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
