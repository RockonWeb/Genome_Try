'use client'

import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    className?: string
}

export const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className={cn(
                                "w-full max-w-md transform overflow-hidden rounded-2xl bg-genome-card border border-genome-border p-6 text-left align-middle shadow-2xl transition-all",
                                className
                            )}>
                                <div className="flex items-center justify-between mb-4">
                                    {title && (
                                        <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-white">
                                            {title}
                                        </Dialog.Title>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors outline-none"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                {children}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
