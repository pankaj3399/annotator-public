# How to Get a Google Maps API Key with Maps JavaScript API and Places API Enabled

To integrate Google Maps into your website, you'll need an API key from Google. This guide will walk you through the steps to obtain a Google API key and enable both the Maps JavaScript API and the Places API.

## Step-by-Step Guide

### 1. Create a Google Cloud Account

If you don't have a Google Cloud account, you'll need to create one:

- Visit the [Google Cloud Console](https://console.cloud.google.com/).
- If you don't have a Google Cloud account, sign up for one.
- You may need to provide billing information (a $300 free credit is available for new users).

### 2. Create a Project in Google Cloud Console

Once you're logged into the Google Cloud Console:

1. Navigate to **Select a Project** in the top menu bar.
2. Click on **New Project** to create a new project.
3. Provide a name for the project and click **Create**.

### 3. Enable Google Maps APIs

To enable the required APIs for your project, follow these steps:

1. In the Google Cloud Console, go to **APIs & Services > Library**.
2. Search for the following APIs and enable them:
    - **Maps JavaScript API**
      - Search for "Maps JavaScript API" in the library and click on it.
      - Click the **Enable** button.
    - **Places API**
      - Search for "Places API" in the library and click on it.
      - Click the **Enable** button.

### 4. Create an API Key

To create an API key for your project:

1. In the Google Cloud Console, navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials** and select **API Key**.
3. A new API key will be generated. Copy the key as you'll need it for your application.

### 5. Restrict Your API Key (Recommended)

To prevent misuse of your API key, it's important to restrict it:

1. In the **Credentials** section of the Google Cloud Console, find your API key.
2. Click on the **pencil icon** next to your API key to edit its settings.
3. Under **Application restrictions**, choose **HTTP referrers (websites)** and add your website domain (e.g., `*.yourdomain.com`).
4. Under **API restrictions**, select **Restrict key** and choose the following APIs:
    - **Maps JavaScript API**
    - **Places API**
5. Save the changes.

### 6. Add the API Key to Your Project

Once you have your API key, you can use it in your project.

In your frontend application, for example, if you're using Next.js, you can store the API key in an environment variable:

1. Add the following line (replace `your-api-key-here` with the actual API key):

    NEXT_PUBLIC_GOOGLE_MAP_API=your-api-key-here

2. Access the API key in your application like this:

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAP_API;

### 7. Monitor API Usage

It's important to monitor your API usage and ensure that there is no unusual activity. You can view usage statistics in the **APIs & Services > Dashboard** section of the Google Cloud Console.

Additionally, you can set up **alerts** to notify you if your usage exceeds the limits you set for your API key.

---

By following these steps, you can successfully obtain a Google Maps API key and enable the Maps JavaScript API and Places API for use in your project.

For more details on Google Maps API usage, visit the [official Google Maps documentation](https://developers.google.com/maps/documentation/).
