
export interface INotificationService {
    /**
     * Displays a notification message to the user.
     * @param message The message to display.
     * @param type The type of notification (e.g., success, error, info).
     * @param duration The duration in milliseconds for which the notification should be displayed.
     * @param onClose Optional callback function to be called when the notification is closed.
     */
    showNotification(
        message: string,
        type: 'success' | 'error' | 'info',
        duration?: number,
        onClose?: () => void
    ): void;
    
}