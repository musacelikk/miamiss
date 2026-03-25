'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type AskQuestionDialogProps = {
  productName: string
}

export function AskQuestionDialog({ productName }: AskQuestionDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [question, setQuestion] = React.useState('')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-border/60 bg-background/60 hover:bg-background"
          type="button"
        >
          Soru sor
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Soru sor</DialogTitle>
          <DialogDescription>
            {productName} ürünü hakkında kısa bir soru yazın. (Demo: Gönderince sadece uyarı gösterilir.)
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = question.trim()
            if (!trimmed) return
            alert('Teşekkürler! Sorunuz alındı. (Demo)')
            setQuestion('')
            setOpen(false)
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="question">
              Sorunuz
            </label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Örn: Bu ürün hangi renk/ölçülerde geliyor?"
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQuestion('')
                setOpen(false)
              }}
            >
              Vazgeç
            </Button>
            <Button type="submit">Gönder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

