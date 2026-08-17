import "./Illnesses.css";
import { illnesses } from "./data";

export default function Illnesses() {
    return (
        <section className="illnesses">
            <div className="illnesses__header">
                {/* <span className="illnesses__dot" /> */}

                <div>
                    <h3>بیماری‌ها</h3>
                    <p
                        className="
                            mt-1
                            text-xs
                            text-[#686c79]
                        "
                    >
                        بهترین‌ روش های درمان این بیماری ها اینجاست!
                    </p>
                </div>
            </div>

            <div className="illnesses__grid">
                {illnesses.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        className="illness"
                    >
                        <div className="illness__icon">
                            <img src={item.icon} alt={item.title} />
                        </div>

                        <span>{item.title}</span>
                    </a>
                ))}
            </div>
        </section>
    );
}
