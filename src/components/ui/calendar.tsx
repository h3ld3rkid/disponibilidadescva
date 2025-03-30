
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-md font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse border-spacing-0 border border-gray-200 rounded-md overflow-hidden",
        head_row: "flex w-full bg-gray-200",
        head_cell:
          "text-muted-foreground rounded-none font-medium text-center text-gray-700 p-2 bg-gray-200 flex-1 text-xs md:text-sm lg:text-base border-b border-gray-300",
        row: "flex w-full mt-0",
        cell: "relative p-0 text-center focus-within:relative focus-within:z-20 border border-gray-200 flex-1 aspect-square h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14", // Smaller dimensions for better alignment
        day: cn(
          "h-full w-full p-0 font-normal aria-selected:opacity-100 cursor-pointer flex items-center justify-center text-xs md:text-sm"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#6E59A5] text-white hover:bg-[#9b87f5] hover:text-white focus:bg-[#6E59A5] focus:text-white",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      weekStartsOn={1} // Start week on Monday (1) instead of Sunday (0)
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
