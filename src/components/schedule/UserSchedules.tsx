
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { format, addMonths } from "date-fns";
import { ptPT } from "date-fns/locale";

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data - in a real implementation, this would fetch from a database
    const mockSchedules = [
      {
        user: "João Silva",
        email: "joao@gmail.com",
        dates: [
          { date: addMonths(new Date(), 1), shifts: ["manha"] },
          { date: new Date(addMonths(new Date(), 1).setDate(5)), shifts: ["manha", "noite"] }
        ]
      },
      {
        user: "Maria Oliveira",
        email: "maria@gmail.com",
        dates: [
          { date: new Date(addMonths(new Date(), 1).setDate(12)), shifts: ["manha"] },
          { date: new Date(addMonths(new Date(), 1).setDate(19)), shifts: ["tarde", "noite"] }
        ]
      },
      {
        user: "António Rodrigues",
        email: "antonio@gmail.com",
        dates: [
          { date: new Date(addMonths(new Date(), 1).setDate(6)), shifts: ["manha"] },
          { date: new Date(addMonths(new Date(), 1).setDate(13)), shifts: ["manha"] },
          { date: new Date(addMonths(new Date(), 1).setDate(20)), shifts: ["manha"] },
          { date: new Date(addMonths(new Date(), 1).setDate(27)), shifts: ["manha"] }
        ]
      }
    ];

    setSchedules(mockSchedules);
    setIsLoading(false);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Escalas dos Utilizadores</CardTitle>
          <CardDescription>Visualize todas as escalas submetidas pelos utilizadores</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-pulse text-gray-500">A carregar escalas...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Turnos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.flatMap((schedule) => 
                  schedule.dates.map((dateInfo: any, dateIndex: number) => (
                    <TableRow key={`${schedule.email}-${dateIndex}`}>
                      {dateIndex === 0 ? (
                        <>
                          <TableCell rowSpan={schedule.dates.length} className="font-medium">{schedule.user}</TableCell>
                          <TableCell rowSpan={schedule.dates.length}>{schedule.email}</TableCell>
                        </>
                      ) : null}
                      <TableCell>{format(new Date(dateInfo.date), "d 'de' MMMM 'de' yyyy", { locale: ptPT })}</TableCell>
                      <TableCell>
                        {dateInfo.shifts.map((shift: string) => (
                          <span key={shift} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                            {shift === "manha" ? "Manhã" : shift === "tarde" ? "Tarde" : "Noite"}
                          </span>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSchedules;
