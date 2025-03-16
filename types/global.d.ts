import mongoose from 'mongoose';

declare global {
  var mongoose: {
    conn: mongoose.Mongoose | null;
    promise: Promise<mongoose.Mongoose> | null;
  };
  
  interface Window {
    gapi?: any; // Make this optional
    google?: { // Make this optional
      picker: {
        View: any;
        ViewId: {
          DOCS: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
        PickerBuilder: any;
        Feature: {
          NAV_HIDDEN: any;
        };
      };
    };
  }

}

export {};