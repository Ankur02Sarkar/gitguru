"use client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import MDEditor from "@uiw/react-md-editor";
import React, { useState } from "react";
import AskQuestionCard from "../dashboard/ask-question-card";
import CodeReferences from "../dashboard/code-references";

const QAPage = () => {
  const { projectId } = useProject();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });

  const [questionIndex, setQuestionIndex] = useState(0);
  const question = questions?.[questionIndex];

  return (
    <Sheet>
      <AskQuestionCard />
      <div className="h-4"></div>
      <h1 className="text-xl font-semibold">Saved Questions</h1>
      <div className="h-2"></div>
      <div className="flex flex-col gap-2">
        {questions?.map((question, index) => {
          return (
            <React.Fragment key={question.id}>
              <SheetTrigger onClick={() => setQuestionIndex(index)}>
                <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow border">
                  <img
                    className="rounded-full"
                    height={30}
                    width={30}
                    src={question.user.imageUrl ?? ""}
                  />

                  <div className="text-left flex flex-col">
                    <div className="flex items-center gap-2">
                      <p className="text-gray-700 line-clamp-1 text-lg font-medium">
                        {question.question}
                      </p>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {question.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-500 line-clamp-1 text-sm">
                      {question.answer}
                    </p>
                  </div>
                </div>
              </SheetTrigger>
            </React.Fragment>
          );
        })}
      </div>

      {question && (
        <SheetContent className="sm:max-w-[80vw] h-screen overflow-auto">
          <SheetHeader>
            <SheetTitle>{question.question}</SheetTitle>
            <div data-color-mode="light">
              <MDEditor.Markdown source={question.answer} />
            </div>
            <CodeReferences
              filesReferences={question.filesReferences ?? ([] as any)}
            />
          </SheetHeader>
        </SheetContent>
      )}
    </Sheet>
  );
};

export default QAPage;
