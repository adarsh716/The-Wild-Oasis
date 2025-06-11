"use client"

import { differenceInDays } from "date-fns";
import { useReservation } from "./ReservationContext";
import { createBooking, createBookingOnline } from "../_lib/actions";
import { useRouter } from "next/navigation";
import axios from "axios";
import Razorpay from "razorpay";

function ReservationForm({ cabin, user }) {
  const router = useRouter();
  const { range, resetRange } = useReservation();
  const { maxCapacity, regularPrice, discount, id } = cabin;

  const startDate = range.from;
  const endDate = range.to;

  const numNights = differenceInDays(endDate, startDate);
  const cabinPrice = numNights * (regularPrice - discount);

  const createBookingWithData = async (bookingData) => {
    try {
      await createBooking(bookingData);
      resetRange();
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("There was an issue creating your booking. Please try again.");
    }
  };

  const handlePayOffline = async (formDataObject) => {
    const bookingData = {
      startDate,
      endDate,
      numNights,
      cabinPrice,
      cabinId: id,
      ...formDataObject, 
    };

    await createBookingWithData(bookingData);
  };

  const handlePayOnline = async (formDataObject) => {
    try {
      const bookingData = {
        startDate,
        endDate,
        numNights,
        cabinPrice,
        cabinId: id,
        ...formDataObject, 
      };

      const amountInPaisa = cabinPrice * 100;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: amountInPaisa, 
        currency: "INR",
        name: "The Wild Oasis",
        description: `Booking for ${numNights} nights`, 
        handler: async function (response) {
          try {
            const { razorpay_payment_id } = response;
            if (!razorpay_payment_id) {
              throw new Error("Payment ID missing from Razorpay response.");
            }
  
            bookingData.paymentId = razorpay_payment_id;

            console.log("Booking data after payment:", bookingData);

            await createBookingOnline(bookingData, formDataObject);

            alert("Payment successful and room booked!");

            resetRange();
            router.push("/cabins/thankyou"); 
          } catch (error) {
            console.error("Error creating booking after payment:", error.message || error);
            alert("There was an issue creating your booking after payment. Please contact support.");
          }
        },
        prefill: {
          name: formDataObject.name || "Guest",
          email: formDataObject.email || "", 
        },
      };

      const paymentObject = new window.Razorpay(options);
  
      // Handle payment failure
      paymentObject.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        alert("Payment failed: " + response.error.description);
      });

      paymentObject.open();
    } catch (error) {
      console.error("Error during online payment process:", error.message || error);
      alert("There was an issue with the payment. Please try again.");
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const formDataObject = Object.fromEntries(formData.entries());

    const submitButton = e.nativeEvent.submitter.name;

    if (submitButton === "payOffline") {
      await handlePayOffline(formDataObject);
    } else if (submitButton === "payOnline") {
      await handlePayOnline(formDataObject);
    }
  };

  return (
    <div className="scale-[1.01]">
      <div className="bg-primary-800 text-primary-300 px-16 py-2 flex justify-between items-center">
        <p>Logged in as</p>

        <div className="flex gap-4 items-center">
          <img
            referrerPolicy="no-referrer"
            className="h-8 rounded-full"
            src={user.image}
            alt={user.name}
          />
          <p>{user.name}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-primary-900 py-10 px-16 text-lg flex gap-5 flex-col"
      >
        <div className="space-y-2">
          <label htmlFor="numGuests">How many guests?</label>
          <select
            name="numGuests"
            id="numGuests"
            className="px-5 py-3 bg-primary-200 text-primary-800 w-full shadow-sm rounded-sm"
            required
          >
            <option value="" key="">
              Select number of guests...
            </option>
            {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((x) => (
              <option value={x} key={x}>
                {x} {x === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="observations">
            Anything we should know about your stay?
          </label>
          <textarea
            name="observations"
            id="observations"
            className="px-5 py-3 bg-primary-200 text-primary-800 w-full shadow-sm rounded-sm"
            placeholder="Any pets, allergies, special requirements, etc.?"
          />
        </div>

        <div className="flex justify-end items-center gap-6">
          {!(startDate && endDate) ? (
            <p className="text-primary-300 text-base">
              Start by selecting dates
            </p>
          ) : (
            <>
              <button
                className="bg-accent-500 px-8 py-4 text-primary-800 font-semibold hover:bg-accent-600 transition-all disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-300"
                name="payOffline"
                type="submit"
              >
                Pay on Arrival
              </button>
              {/* <button
                className="bg-accent-500 px-8 py-4 text-primary-800 font-semibold hover:bg-accent-600 transition-all disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-300"
                name="payOnline"
                type="submit"
              >
                Pay Online
              </button> */}
            </>
          )}
        </div>
      </form>
    </div>
  );
}

export default ReservationForm;
